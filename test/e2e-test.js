/* jshint node:true, quotmark:false */
/* global describe, it, beforeEach, afterEach */

'use strict';

var assert = require('assert'),
    http = require('http'),
    fs = require('fs'),
    goodGuyLib = require('good-guy-http'),
    events = require('events'),
    Promise = require('bluebird'),

    Clock = require('./clock'),

    ESI = require('../lib/esi'),
    DataProvider = require('../lib/data-provider');

describe('ESI processor', function () {

    var server = null;
    var port = '';

    // setup listening server and update port
    beforeEach(function () {
        server = new http.Server();
        server.listen();
        port = server.address().port;
    });

    afterEach(function () {
        server.close();
        server = null;
    });


    it('should fetch one external component', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        var html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);

    });

    it('should fetch one external component with single quoted src', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        var html = "<section><esi:include src='http://localhost:" + port + "'></esi:include></section>";

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);

    });

    it('should fetch one external component with unquoted src', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        var html = '<section><esi:include src=http://localhost:' + port + '></esi:include></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);

    });

    it('should fetch one self-closed external component', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        var html = '<section><esi:include src="http://localhost:' + port + '"/></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);

    });

    it('should handle self-closing tags in html', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        var html = '<section><esi:include src="http://localhost:' + port + '"></esi:include><img src="some-image" /></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div><img src="some-image" /></section>');
            done();
        }).catch(done);

    });

    it('should fetch one relative component', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);

    });


    it('should fetch one relative component (no leading slash)', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="header"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);

    });


    it('should fetch multiple components', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test header</div>');
            } else if (req.url === '/footer') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test footer</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include><esi:include src="/footer"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<div>test header</div><div>test footer</div>');
            done();
        }).catch(done);

    });

    it('should handle immediately closed html tags', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<section></section><div>something</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section></section><div>something</div>');
            done();
        }).catch(done);

    });

    it('should gracefully degrade to empty content on error', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end();
        });

        var html = '<esi:include src="/error"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '');
            done();
        }).catch(done);

    });

    it('should execute optional callback on error', function (done) {

        // given
        var assertionCount = 0;
        server.addListener('request', function (req, res) {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end();
        });

        var html = '<esi:include src="/error"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port,
            onError: function(src, error) {
                assertionCount += 2;
                assert.equal(error.message, 'HTTP error: status code 500');
                assert.equal(src, 'http://localhost:' + port + '/error');
                return '<div>something went wrong</div>';
            }
        }).process(html);

        // then
        processed.then(function (response) {
            assertionCount++;
            assert.equal(response, '<div>something went wrong</div>');
            assert.equal(assertionCount, 3);
            done();
        }).catch(done);

    });

    it('should gracefully degrade to empty content on timeout', function (done) {

        // given
        server.addListener('request', function (req, res) {
            setTimeout(function () {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('this should not happen');
            }, 10);
        });

        var html = '<esi:include src="/error"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port,
            httpClient: goodGuyLib({
                timeout: 1
            })
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '');
            done();
        }).catch(done);

    });

    it('should allow to disable cache', function (done) {

        var connectionCount = 0;

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            if(connectionCount === 0) {
                res.end('hello');
            }
            else {
                res.end('world');
            }
            connectionCount++;
        });

        var html = '<esi:include src="/cacheme"></esi:include>';

        // when
        var esi = new ESI({
            baseUrl: 'http://localhost:' + port,
            cache: false
        });

        var processed = esi.process(html);

        // then
        processed.then(function (response) {
            return esi.process(html);
        }).then(function (response) {
            assert.equal(response, 'world');
            done();
        }).catch(done);

    });

    it('should fetch components recursively', function (done) {
        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            if (req.url === '/first') {
                res.end('<esi:include src="http://localhost:' + port + '/second"></esi:include>');
            } else if (req.url === '/second') {
                res.end('<esi:include src="http://localhost:' + port + '/third"></esi:include>');
            } else {
                res.end('<div>test</div>');
            }

        });

        var html = '<section><esi:include src="http://localhost:' + port + '/first"></esi:include></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should set max fetch limit for recursive components', function (done) {
       // given
       server.addListener('request', function (req, res) {
           res.writeHead(200, {'Content-Type': 'text/html'});
           res.end('<esi:include src="http://localhost:' + port + '"></esi:include>');
       });
    
       var html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';
    
       // when
       var processed = new ESI({
           maxDepth: 5
       }).process(html);
    
       // then
       processed.then(function (response) {
           assert.equal(response, '<section></section>');
           done();
       }).catch(done);
    });

    it('should pass specified headers to server', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if (req.headers['x-custom-header']) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test</div>');
            }
            else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('you should not get this');
            }
        });

        var html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';

        // when
        var processed = new ESI().process(html, {
            headers: {
                'x-custom-header': 'blah'
            }
        });

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);

    });

    it('should be able to use custom log output', function (done) {

        // given
        var esi  = new ESI({
            logTo: {
                write: function(log) {
                    // then
                    assert.equal(log, 'test');
                    done();
                }
            }
        });

        // when
        esi.logger.write('test');

    });

    it('should be able to log output to a file', function (done) {

        // given
        var PATH = './test/logger-test-output.txt';
        var stream = fs.createWriteStream(PATH);
        var testStr = '' + Math.random();
        var esi  = new ESI({
            logTo: stream
        });

        // when
        esi.logger.write(testStr);

        // then
        fs.readFile(PATH, function(err, contents) {
            if(err) {
                done(err);
            } else {
                assert.equal(contents, testStr);
                fs.unlink(PATH, done);
            }
        });
    });

});
