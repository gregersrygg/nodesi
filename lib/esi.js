/* jshint node:true, quotmark:false */

'use strict';

var DataProvider = require('./data-provider'),
    Logger = require('./logger'),
    Promise = require('bluebird');

function ESI(config) {
    var self = this;

    config = config || {};

    this.maxDepth = config.maxDepth || 3;
    this.onError = config.onError || function() { };

    this.dataProvider = config.dataProvider || new DataProvider(config);
    this.logger = new Logger(config);
}

ESI.DataProvider = DataProvider;
ESI.Logger = Logger;

ESI.prototype.processHtmlText = function(html, options, state) {
    var self = this;
    options = options || {};

    state = state || {};
    state.currentDepth = state.currentDepth || 0;

    return new Promise(function (resolve, reject) {
        var subtasks = [],
            i = 0,
            maxDepthReached = state.currentDepth > self.maxDepth;

        self.findESIInclueTags(html, options).forEach(function(tag) {
            var placeholder = '<!-- esi-placeholder-' + i + ' -->';

            if (maxDepthReached) {
                html = html.replace(tag, '');
            } else if(tag.indexOf('<esi:include') > -1) {
                html = html.replace(tag, placeholder);
                subtasks[i] = self.getIncludeContents(tag, options).then(function(result) {
                    html = html.replace(placeholder, result);
                    return true;
                });
                i++;
            }
        });

        Promise.all(subtasks).then(function () {
            if (self.hasESITag(html)) {
                state.currentDepth++;
                self.processHtmlText(html, options, state).then(function (result) {
                    resolve(result);
                });
            } else {
                resolve(html);
            }
        });
    });
};

ESI.prototype.process = function (html, options) {
    var self = this;

    return self.processHtmlText(html, options);
};

ESI.prototype.hasESITag = function(html) {
    return html.indexOf('<esi:') > -1;
};

ESI.prototype.findESIInclueTags = function(html) {
    var open = '<esi:include',
        fullClose = '</esi:include>',
        selfClose = '/>',
        tags = [],
        nextTagOpen,
        nextTagFullClose,
        nextTagSelfClose,
        reducedHtml = html;

    do {
        nextTagOpen = reducedHtml.indexOf(open);
        if(nextTagOpen > -1) {
            reducedHtml = reducedHtml.substr(nextTagOpen);
            nextTagFullClose = reducedHtml.indexOf(fullClose);
            nextTagSelfClose = reducedHtml.indexOf(selfClose);

            if(nextTagFullClose > -1 &&
               (Math.max(0, nextTagFullClose - fullClose.length) < Math.max(0, nextTagSelfClose - selfClose.length)) ||
            nextTagSelfClose === -1) {
                tags.push(reducedHtml.substr(0, nextTagFullClose + fullClose.length));
                reducedHtml = reducedHtml.substr(nextTagFullClose + fullClose.length);
            } else {
                tags.push(reducedHtml.substr(0, nextTagSelfClose + selfClose.length));
                reducedHtml = reducedHtml.substr(nextTagSelfClose + selfClose.length);
            }
        }
    } while(nextTagOpen > -1);

    return tags;
};

ESI.prototype.getIncludeContents = function (tag, options) {
    var self = this,
        src = self.getDoubleQuotedSrc(tag) || self.getSingleQuotedSrc(tag) || self.getUnquotedSrc(tag);

    return self.get(src, options);
};

ESI.prototype.getBoundedString = function(open, close) {
    return function(str) {
        var before = str.indexOf(open),
            strFragment,
            after;

        if(before > -1) {
            strFragment = str.substr(before + open.length);
            after = strFragment.indexOf(close);
            return strFragment.substr(0, after);
        }
        return '';
    };
};

ESI.prototype.getDoubleQuotedSrc = ESI.prototype.getBoundedString('src="', '"');
ESI.prototype.getSingleQuotedSrc = ESI.prototype.getBoundedString("src='", "'");
ESI.prototype.getUnquotedSrc = ESI.prototype.getBoundedString('src=', '>');

ESI.prototype.get = function (src, options) {
    var self = this;
    src = self.dataProvider.toFullyQualifiedURL(src);

    return new Promise(function (resolve, reject) {
        self.dataProvider.get(src, options)
            .then(function (result) {
                resolve(result.body);
            })
            .catch(function (error) {
                resolve(self.handleError(src, error));
            });
    });
};

ESI.prototype.handleError = function(src, error) {
    var handlerResult = this.onError(src, error);
    
    if (typeof handlerResult === 'string') {
        return handlerResult;
    }
    return '';
};

module.exports = ESI;
