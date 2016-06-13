'use strict';
/*globals describe, it, before, beforeEach, afterEach*/

const async = require('async');
const winston = require('winston');
const request = require('request');
const sinon = require('sinon');

process.on('uncaughtException', function (err) {
	winston.error('Encountered error while running test suite: ' + err.message);
});

const chai = require('chai');
chai.should();

const settings = {};
const socketAdmin = {};
socketAdmin.settings = {};
const user = {
	getUidByUsername: () => {},
	setUserField: () => {}
};
const topics = {
	post: () => {}
};
const privileges = {
	categories: {
		get: () => {}
	}
};
const meta = {
	config: {
		postDelay: 0,
		newbiePostDelay: 0
	}
};
const db = {
	setObjectField: () => {},
	sortedSetsAdd: () => {}
};
const nconf = {};

const imports = {
	async: async,
	settings: settings,
	socketAdmin: socketAdmin,
	request: request,
	user: user,
	topics: topics,
	privileges: privileges,
	meta: meta,
	db: db,
	nconf: nconf,
	winston: winston
};

const tdwtfArticles = require('../library')(imports);

describe('tdwtfArticles:', () => {

	describe('The Yahoo query', () => {
	
		let feed;
		const testUrl = 'https://community.nodebb.org/topic/8923.rss';
		const numEntries = 2;
	
		before(function(done) {
			tdwtfArticles.getFeedFromYahoo(testUrl, numEntries, function(err, f) {
				if (err) {
					throw err;
				}
				feed = f;
				done();
			});
		});
	
		it('should return an array of entries', () => {
			feed.should.be.an('array');
			feed.length.should.equal(numEntries);
			for (let i = 0; i < numEntries; i++) {
				feed[i].entry.should.be.an('object');
			}
		});
		
		describe('The entries', () => {
			it('should have a title', () => {
				for (let i = 0; i < numEntries; i++) {
					feed[i].entry.title.should.be.a('string');
				}
			});
			it('should have an author', () => {
				for (let i = 0; i < numEntries; i++) {
					feed[i].entry.author.should.be.an('object');
					feed[i].entry.author.name.should.be.a('string');
				}
			});
			it('should have a link', () => {
				for (let i = 0; i < numEntries; i++) {
					feed[i].entry.link.should.be.an('object');
					feed[i].entry.link.href.should.be.a('string');
				}
			});
			it('should have a published date', () => {
				for (let i = 0; i < numEntries; i++) {
					new Date(feed[i].entry.published).should.be.a('Date');
				}
			});
		});
		
		describe('The error handler', () => {
		
			let sandbox, req;
			
			beforeEach(() => {
				sandbox = sinon.sandbox.create();
				req = sandbox.stub(request, 'get');
			});
		
			afterEach(() => sandbox.restore());
			
			it('should handle HTTP errors', () => {
				req.yields(null, {
					statusCode: 400
				}, {});
				const callback = sandbox.spy();
				tdwtfArticles.getFeedFromYahoo(testUrl, numEntries, callback);
				callback.calledWith(sinon.match.any).should.be.true;
			});
			it('should handle funky responses', () => {
				req.yields(null, {
					statusCode: 200
				}, 'this is not an object');
				const callback = sandbox.spy();
				tdwtfArticles.getFeedFromYahoo(testUrl, numEntries, callback);
				callback.calledWith(sinon.match.any).should.be.true;
			});
			it('should handle empty responses', () => {
				req.yields(null, {
					statusCode: 200
				}, JSON.stringify({
					query: {
						count: 0
					}
				}));
				const callback = sandbox.spy();
				tdwtfArticles.getFeedFromYahoo(testUrl, numEntries, callback);
				callback.called.should.be.true;
				callback.calledWith(null, sinon.match.any).should.be.true;
			});
		
		});
		
	});
	
	describe('The Yahoo query processor', () => {
	
		let sandbox, postArticle;
		
		beforeEach(() => {
		
			sandbox = sinon.sandbox.create();
			postArticle = sandbox.stub(tdwtfArticles, 'postArticle');
			postArticle.yields();
			
			tdwtfArticles.config = {
				latestDate: new Date('2016-05-23T10:30:00Z').getTime()
			};
			
		});
		
		afterEach(() => sandbox.restore());
		
		const entry1 = {
			entry: {
				title: 'Title 1',
				link: { href: 'http://example.com/post1' },
				author: { name: 'Charlene Berry' },
				published: '2016-05-23T09:30:00Z'
			}
		};
		const entry2 = {
			entry: {
				title: 'Title 2',
				link: { href: 'http://example.com/post2' },
				author: { name: 'Edgar Leyman' },
				published: '2016-05-23T11:30:00Z'
			}
		};
		const entry3 = {
			entry: {
				title: 'Title 3',
				link: { href: 'http://example.com/post3' },
				author: { name: 'Alec McGovern' },
				published: '2016-05-23T11:31:00Z'
			}
		};

		it('should not post an old article', () => {
			const callback = sandbox.spy();
			tdwtfArticles.processYahooEntries(entry1, callback);
			postArticle.called.should.be.false;
			callback.calledWith(null, tdwtfArticles.config.latestDate).should.be.true;
		});
		it('should post a new article', () => {
			const callback = sandbox.spy();
			const expectedDate = new Date(entry2.entry.published).getTime();
			tdwtfArticles.processYahooEntries(entry2, callback);
			postArticle.calledOnce.should.be.true;
			postArticle.calledWith(entry2.entry, sinon.match.func).should.be.true;
			callback.calledWith(null, expectedDate).should.be.true;
		});
		it('should not post when given no entries', () => {
			const callback = sandbox.spy();
			tdwtfArticles.processYahooEntries({}, callback);
			postArticle.called.should.be.false;
			callback.calledWith(null, tdwtfArticles.config.latestDate).should.be.true;
		});
		it('should post only new articles (newer first)', () => {
			const callback = sandbox.spy();
			const expectedDate = new Date(entry3.entry.published).getTime();
			tdwtfArticles.processYahooEntries([ entry3, entry2, entry1 ], callback);
			postArticle.calledTwice.should.be.true;
			postArticle.calledWith(entry1.entry, sinon.match.func).should.be.false;
			postArticle.calledWith(entry2.entry, sinon.match.func).should.be.true;
			postArticle.calledWith(entry3.entry, sinon.match.func).should.be.true;
			callback.calledWith(null, expectedDate).should.be.true;
		});
		it('should post only new articles (older first)', () => {
			const callback = sandbox.spy();
			const expectedDate = new Date(entry3.entry.published).getTime();
			tdwtfArticles.processYahooEntries([ entry1, entry2, entry3 ], callback);
			postArticle.calledTwice.should.be.true;
			postArticle.calledWith(entry1.entry, sinon.match.func).should.be.false;
			postArticle.calledWith(entry2.entry, sinon.match.func).should.be.true;
			postArticle.calledWith(entry3.entry, sinon.match.func).should.be.true;
			callback.calledWith(null, expectedDate).should.be.true;
		});
	
	});
	
	describe('The post creator', () => {
	
		let entry;
		const uid = 3;
		const cid = 4;
		
		beforeEach(() => {
			entry = {
				title: 'Title 1',
				link: { href: 'http://example.com/post1' },
				author: { name: 'Charlene Berry' },
				published: '2016-05-23T09:30:00Z'
			};
		});
		
		it('should create a basic post', () => {
			tdwtfArticles.config = {
				tagWithCategory: 0,
				category: cid
			};
			const expected = {
				uid:uid,
				title: entry.title,
				content: 'http://example.com/post1\n\nBy Charlene Berry on 2016-05-23',
				cid: cid,
				tags: []
			};
			tdwtfArticles.createPost(entry, uid).should.deep.equal(expected);
		});
		it('should create a basic post with tags', () => {
			tdwtfArticles.config = {
				tags: 'We need a new,Tag cloud to attack',
				tagWithCategory: 0,
				category: cid
			};
			const expected = {
				uid:uid,
				title: entry.title,
				content: 'http://example.com/post1\n\nBy Charlene Berry on 2016-05-23',
				cid: cid,
				tags: [
					'We need a new',
					'Tag cloud to attack'
				]
			};
			tdwtfArticles.createPost(entry, uid).should.deep.equal(expected);
		});
		it('should create a basic post with a category', () => {
			tdwtfArticles.config = {
				tags: 'We need a new,Tag cloud to attack',
				tagWithCategory: 0,
				category: cid
			};
			entry.category = { term: 'Error\'d' };
			const expected = {
				uid:uid,
				title: entry.title,
				content: 'http://example.com/post1\n\nBy Charlene Berry in Error\'d on 2016-05-23',
				cid: cid,
				tags: [
					'We need a new',
					'Tag cloud to attack'
				]
			};
			tdwtfArticles.createPost(entry, uid).should.deep.equal(expected);
		});
		it('should create a basic post with a category tag', () => {
			tdwtfArticles.config = {
				tags: 'We need a new,Tag cloud to attack',
				tagWithCategory: 1,
				category: cid
			};
			entry.category = { term: 'Error\'d' };
			const expected = {
				uid:uid,
				title: entry.title,
				content: 'http://example.com/post1\n\nBy Charlene Berry in Error\'d on 2016-05-23',
				cid: cid,
				tags: [
					'We need a new',
					'Tag cloud to attack',
					'Error\'d'
				]
			};
			tdwtfArticles.createPost(entry, uid).should.deep.equal(expected);
		});
	
	});
	
	describe('The article poster', () => {
	
		let sandbox;
		
		beforeEach(() => {
		
			sandbox = sinon.sandbox.create();
			
			tdwtfArticles.config = {
				latestDate: new Date('2016-05-23T10:30:00Z').getTime(),
				userName: 'PaulaBean',
				category: 6,
				authors: [
					{ name: 'Charlene Berry', user: 'cberry' }
				]
			};
			
		});
		
		afterEach(() => sandbox.restore());
		
		const entry1 = {
			title: 'Title 1',
			link: { href: 'http://example.com/post1' },
			author: { name: 'Charlene Berry' },
			published: '2016-05-23T09:30:00Z',
			category: { term: 'Error\'d' }
		};
		const entry2 = {
			title: 'Title 2',
			link: { href: 'http://example.com/post2' },
			author: { name: 'Edgar Leyman' },
			published: '2016-05-23T11:30:00Z'
		};
		
		it('should get an author\'s user name', () => {
			const getUidByUsername = sandbox.stub(user, 'getUidByUsername');
			const err = new Error('not really an error');
			getUidByUsername.yields(err);
			const callback = sandbox.spy();
			tdwtfArticles.postArticle(entry1, callback);
			callback.calledWith(err).should.be.true;
			getUidByUsername.calledWith('cberry').should.be.true;
		});
		it('should get the default user name', () => {
			const getUidByUsername = sandbox.stub(user, 'getUidByUsername');
			const err = new Error('not really an error');
			getUidByUsername.yields(err);
			const callback = sandbox.spy();
			tdwtfArticles.postArticle(entry2, callback);
			callback.calledWith(err).should.be.true;
			getUidByUsername.calledWith('PaulaBean').should.be.true;
		});
		it('should get the correct uid', () => {
			sandbox.stub(user, 'getUidByUsername').yields(null, 5);
			sandbox.stub(privileges.categories, 'get').yields(null, {
				uid: 5,
				'topics:create': true
			});
			const err = new Error('not really an error');
			const topicsPost = sandbox.stub(topics, 'post');
			topicsPost.yields(err);
			const callback = sandbox.spy();
			tdwtfArticles.postArticle(entry1, callback);
			callback.calledWith(err).should.be.true;
			topicsPost.calledWithMatch({ uid: 5 }).should.be.true;
		});
		it('should use the default uid', () => {
			sandbox.stub(user, 'getUidByUsername').yields(null, 5);
			sandbox.stub(privileges.categories, 'get').yields(null, {
				uid: 5,
				'topics:create': false
			});
			const err = new Error('not really an error');
			const topicsPost = sandbox.stub(topics, 'post');
			topicsPost.yields(err);
			const callback = sandbox.spy();
			tdwtfArticles.postArticle(entry1, callback);
			callback.calledWith(err).should.be.true;
			topicsPost.calledWithMatch({ uid: 1 }).should.be.true;
		});

		it('should cange the post timestamp', () => {
			const timestamp = new Date(entry1.published).getTime();
			tdwtfArticles.config.timestamp = 'article';
			sandbox.stub(user, 'getUidByUsername').yields(null, 5);
			sandbox.stub(privileges.categories, 'get').yields(null, {
				uid: 5,
				'topics:create': true
			});
			sandbox.stub(topics, 'post').yields(null, {
				topicData: {
					tid: 123,
					cid: 6,
					uid: 5
				},
				postData: {
					pid: 456
				}
			});
			sandbox.stub(user, 'setUserField').yields();
			const setObjectField = sandbox.spy(db, 'setObjectField');
			const sortedSetsAdd = sandbox.spy(db, 'sortedSetsAdd');
			const callback = sandbox.spy();
			tdwtfArticles.postArticle(entry1, callback);
			callback.calledOnce.should.be.true;
			setObjectField.calledWithMatch('topic:123', 'timestamp', timestamp).should.be.true;
			sortedSetsAdd.calledWithMatch(sinon.match.array, timestamp, 123).should.be.true;
			setObjectField.calledWithMatch('post:456', 'timestamp', timestamp).should.be.true;
			sortedSetsAdd.calledWithMatch(sinon.match.array, timestamp, 456).should.be.true;
		});
		it('should not cange the post timestamp', () => {
			tdwtfArticles.config.timestamp = 'now';
			sandbox.stub(user, 'getUidByUsername').yields(null, 5);
			sandbox.stub(privileges.categories, 'get').yields(null, {
				uid: 5,
				'topics:create': true
			});
			sandbox.stub(topics, 'post').yields(null, {});
			sandbox.stub(user, 'setUserField').yields();
			const setObjectField = sandbox.spy(db, 'setObjectField');
			const sortedSetsAdd = sandbox.spy(db, 'sortedSetsAdd');
			const callback = sandbox.spy();
			tdwtfArticles.postArticle(entry1, callback);
			callback.calledOnce.should.be.true;
			setObjectField.called.should.be.false;
			sortedSetsAdd.called.should.be.false;
		});
	
	});
	
	describe('The article getter', () => {
	
		let sandbox, set, persist;
		const date1 = new Date('2016-05-23T09:30:00Z').getTime();
		const date2 = new Date('2016-05-23T10:30:00Z').getTime();
		const date3 = new Date('2016-05-23T11:30:00Z').getTime();
		
		beforeEach(() => {
		
			sandbox = sinon.sandbox.create();
			
			tdwtfArticles.config = {
				latestDate: date2
			};
			tdwtfArticles.settings = {
				set: () => {},
				persist: () => {}
			};
			set = sandbox.spy(tdwtfArticles.settings, 'set');
			persist = sandbox.spy(tdwtfArticles.settings, 'persist');
			
		});
		
		afterEach(() => sandbox.restore());
		
		it('should save more recent dates', () => {
			sandbox.stub(tdwtfArticles, 'getFeedFromYahoo').yields();
			sandbox.stub(tdwtfArticles, 'processYahooEntries').yields(null, date3);
			tdwtfArticles.getArticles();
			set.calledWith('latestDate', date3).should.be.true;
			persist.called.should.be.true;
		});
		it('should not save less recent dates', () => {
			sandbox.stub(tdwtfArticles, 'getFeedFromYahoo').yields();
			sandbox.stub(tdwtfArticles, 'processYahooEntries').yields(null, date1);
			tdwtfArticles.getArticles();
			set.called.should.be.false;
			persist.called.should.be.false;
		});
		it('should log errors', () => {
			sandbox.stub(tdwtfArticles, 'getFeedFromYahoo').yields();
			sandbox.stub(tdwtfArticles, 'processYahooEntries').yields(new Error('not really an error'));
			tdwtfArticles.getArticles();
		});
		it('should handle exceptions', () => {
			sandbox.stub(tdwtfArticles, 'getFeedFromYahoo').throws();
			tdwtfArticles.getArticles();
		});
		
	});
	
});

