'use strict';
/*globals describe, it, before*/

const async = require('async');
const winston = require('winston');
const request = require('request');

process.on('uncaughtException', function (err) {
	winston.error('Encountered error while running test suite: ' + err.message);
});

const chai = require('chai');
chai.should();

const settings = {};
const socketAdmin = {};
socketAdmin.settings = {};
const user = {};
const topics = {};
const privileges = {};
const meta = {};
const db = {};
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
			for (var i = 0; i < numEntries; i++) {
				feed[i].entry.should.be.an('object');
			}
		});
		
		describe('The entries', () => {
			it('should have a title', () => {
				for (var i = 0; i < numEntries; i++) {
					feed[i].entry.title.should.be.a('string');
				}
			});
			it('should have an author', () => {
				for (var i = 0; i < numEntries; i++) {
					feed[i].entry.author.should.be.an('object');
					feed[i].entry.author.name.should.be.a('string');
				}
			});
			it('should have a link', () => {
				for (var i = 0; i < numEntries; i++) {
					feed[i].entry.link.should.be.an('object');
					feed[i].entry.link.href.should.be.a('string');
				}
			});
			it('should have a published date', () => {
				for (var i = 0; i < numEntries; i++) {
					new Date(feed[i].entry.published).should.be.a('Date');
				}
			});
		});
		
	});

});

