'use strict';

var async;
var Settings;
var socketAdmin;
var request;
var user;
var topics;
var privileges;
var meta;
var db;
var nconf;
var winston;
var CronJob = require('cron').CronJob;

var tdwtfArticles = function(imports) { // eslint-disable-line complexity
	imports = imports || {};
	async = imports.async || module.parent.require('async');
	Settings = imports.settings || module.parent.require('./settings');
	socketAdmin = imports.socketAdmin || module.parent.require('./socket.io/admin');
	request = imports.request || module.parent.require('request');
	user = imports.user || module.parent.require('./user');
	topics = imports.topics || module.parent.require('./topics');
	privileges = imports.privileges || module.parent.require('./privileges');
	meta = imports.meta || module.parent.require('./meta');
	db = imports.db || module.parent.require('./database');
	nconf = imports.nconf || module.parent.require('nconf');
	winston = imports.winston || module.parent.require('winston');
	return tdwtfArticles;
};

// add plugin settings to admin menu
tdwtfArticles.adminMenu = function(customHeader, callback) {
	customHeader.plugins.push({
		'route': '/plugins/tdwtfarticles',
		'icon': 'fa_file_text_o',
		'name': 'TDWTF Articles'
	});
	callback(null, customHeader);
};
function renderAdmin(req, res, next) { // eslint-disable-line no-unused-vars
	res.render('admin/plugins/tdwtfarticles', {});
}

var config = {};

var cronJobs = [];

function restartCronJobs() {
	if (nconf.get('isPrimary') === 'true') {
		stopCronJobs();
		cronJobs[config.interval].start();
	}
}
function stopCronJobs() {
	if (nconf.get('isPrimary') === 'true') {
		for (var job in cronJobs) {
			cronJobs[job].stop();
		}
	}
}

tdwtfArticles.adminDeactivate = function(id) {
	if (id === 'nodebb-plugin-tdwtf-articles') {
		stopCronJobs();
	}
};

tdwtfArticles.onClearRequireCache = function(data, callback) {
	stopCronJobs();
	callback(null, data);
};

// reload settings and restart cron jobs
tdwtfArticles.syncSettings = function() {
	config = tdwtfArticles.settings.get();
	if (config.enabled) {
		restartCronJobs();
	} else {
		stopCronJobs();
	}
};

tdwtfArticles.init = function(data, callback) {

	if (!socketAdmin) {
		tdwtfArticles();
	}
	socketAdmin.settings.syncTdwtfArticles = function() {
		tdwtfArticles.settings.sync(tdwtfArticles.syncSettings);
	};

	var app = data.router;
	var middleware = data.middleware;
	app.get('/admin/plugins/tdwtfarticles', middleware.admin.buildHeader, renderAdmin);
	app.get('/api/admin/plugins/tdwtfarticles', renderAdmin);

	cronJobs.minute = new CronJob('* * * * *', tdwtfArticles.getArticles, null, false);
	cronJobs.hour = new CronJob('0 * * * *', tdwtfArticles.getArticles, null, false);
	cronJobs.halfDay = new CronJob('0 0/12 * * *', tdwtfArticles.getArticles, null, false);
	cronJobs.day = new CronJob('0 0 * * *', tdwtfArticles.getArticles, null, false);

	var defaultSettings = {
		enabled: 0,
		url: 'http://syndication.thedailywtf.com/TheDailyWtf',
		interval: 'hour',
		entries: 4,
		timestamp: 'now',
		latestDate: 0,
		category: 1,
		tagWithCategory: 1,
		tags: '',
		userName: '',
		authors: [
			{name: 'Alex Papadimoulis', user: 'apapadimoulis'}
		]
	};
	tdwtfArticles.settings = new Settings('tdwtfarticles', '0.5', defaultSettings, tdwtfArticles.syncSettings);
	socketAdmin.settings.getTdwtfArticlesDefaults = function (socket, _, next) {
		next(null, tdwtfArticles.settings.createDefaultWrapper());
	};
	
	callback();
};

// use YQL feednormalizer to get RSS feed as an object
tdwtfArticles.getFeedFromYahoo = function(url, entries, callback) {
	
	var yahooQuery = encodeURIComponent('select entry FROM feednormalizer WHERE url=\'' + url +
		'\' AND output=\'atom_1.0\' AND timeout=\'120000\' | truncate(count=' + entries + ')');
	var requestUrl = 'https://query.yahooapis.com/v1/public/yql?q=' + yahooQuery + '&format=json';

	async.waterfall([
		async.apply(request.get, requestUrl),
		function(response, body, next) {
			if (response.statusCode !== 200) {
				next(new Error('YQL returned ' + response.statusCode));
			} else {
				try {
					var yahooResponse = JSON.parse(body);
					if (yahooResponse.query.count > 0) {
						next(null, yahooResponse.query.results.feed);
					} else {
						next();
					}
				} catch (e) {
					next(e);
				}
			}
		}
	], callback);

};

// post articles from the YQL feed
// but only if they're newer than latest posted article
tdwtfArticles.processYahooEntries = function(entries, callback) {
	entries = Array.isArray(entries) ? entries : [entries];

	var mostRecent = config.latestDate;
	var entryDate;
	entries = entries.filter(Boolean);
	async.eachSeries(entries, function(obj, next) {
		var entry = obj.entry;
		if (!entry) {
			next();
		} else {
			entryDate = new Date(entry.published).getTime();
			if (entryDate > config.latestDate) {
				if (entryDate > mostRecent) {
					mostRecent = entryDate;
				}
				tdwtfArticles.postArticle(entry, next);
			} else {
				next();
			}
		}
	}, function(err) {
		callback(err, mostRecent);
	});
};

// change topic date to article published date
function setTimestampToArticlePublishedDate(data, entry) {
	var topicData = data.topicData;
	var postData = data.postData;
	var tid = topicData.tid;
	var pid = postData.pid;
	var timestamp = new Date(entry.published).getTime();

	db.setObjectField('topic:' + tid, 'timestamp', timestamp);
	db.sortedSetsAdd([
		'topics:tid',
		'cid:' + topicData.cid + ':tids',
		'cid:' + topicData.cid + ':uid:' + topicData.uid + ':tids',
		'uid:' + topicData.uid + ':topics'
	], timestamp, tid);

	db.setObjectField('post:' + pid, 'timestamp', timestamp);
	db.sortedSetsAdd([
		'posts:pid',
		'cid:' + topicData.cid + ':pids'
	], timestamp, pid);
}

// get the forum user name from an author's real name, or null
function getAuthorUserName(authors, name) {
	for (var i = 0; i < authors.length; i++) {
		if (authors[i].name === name) {
			return authors[i].user;
		}
	}
	return null;
}

tdwtfArticles.createPost = function(entry, uid) {
	var tags = [];
	if (config.tags) {
		tags = config.tags.split(',');
	}

	var link = (entry.link && entry.link.href) ? entry.link.href : '';
	var content = link + '\n\nBy ' + entry.author.name;
	if (entry.category && entry.category.term) {
		content = content + ' in ' + entry.category.term;
		if (config.tagWithCategory) {
			tags.push(entry.category.term);
		}
	}
	var date = new Date(entry.published).toISOString().slice(0, 10);
	content = content + ' on ' + date;

	var topicData = {
		uid: uid,
		title: entry.title,
		content: content,
		cid: config.category,
		tags: tags
	};
	return topicData;
};

// post the article
tdwtfArticles.postArticle = function(entry, callback) {

	winston.verbose('[nodebb-plugin-tdwtf-articles] Posting ' + entry.title);
	
	var uid;
	
	async.waterfall([
		function(next) {
			var username = getAuthorUserName(config.authors, entry.author.name) || config.userName;
			user.getUidByUsername(username, next);
		},
		function(_uid, next) {
			privileges.categories.get(config.category, _uid, next);
		},
		function(privilegesData, next) {
			
			if (privilegesData['topics:create']) {
				uid = privilegesData.uid;
			} else {
				winston.error('[nodebb-plugin-tdwtf-articles] User ' + privilegesData.uid +
					' does not have permission to create topics in Category ' + privilegesData.cid +
					', posting as User 1');
				uid = 1;
			}
			
			var topicData = tdwtfArticles.createPost(entry, uid);
			topics.post(topicData, next);
		},
		function(data, next) {
			if (config.timestamp === 'article') {
				setTimestampToArticlePublishedDate(data, entry);
			}
			var max = Math.max(parseInt(meta.config.postDelay, 10) || 10, parseInt(meta.config.newbiePostDelay, 10) || 10) + 1;
			user.setUserField(uid, 'lastposttime', Date.now() - max * 1000, next);
		}
	], callback);

};

// save date of latest post to the database
tdwtfArticles.saveLatestDate = function(mostRecent, callback) {
	if (mostRecent > tdwtfArticles.settings.get('latestDate')) {
		tdwtfArticles.settings.set('latestDate', mostRecent);
		tdwtfArticles.settings.persist(callback);
	} else {
		callback();
	}
};

// get articles from RSS feed and post new articles to the forum
tdwtfArticles.getArticles = function() {

	winston.verbose('[nodebb-plugin-tdwtf-articles] Getting articles from RSS feed.');
	async.waterfall([
		async.apply(tdwtfArticles.getFeedFromYahoo, config.url, config.entries),
		tdwtfArticles.processYahooEntries,
		tdwtfArticles.saveLatestDate
	], function(err) {
		if (err) {
			winston.error('[nodebb-plugin-tdwtf-articles] Error: ' + err.message);
		}
	});

};

module.exports = tdwtfArticles;

