"use strict";
require('date-format-lite');
var es6_promise_1 = require('es6-promise');
var node_workhorse_1 = require('node-workhorse');
var s3_append_1 = require('s3-append');
var consolidate_logs_1 = require('../util/consolidate-logs');
var aws_util_1 = require('../util/aws-util');
var S3Logger = (function () {
    function S3Logger(originalConfig) {
        this.originalConfig = originalConfig;
        this.outsideWorkToLoggerMap = {};
        this.insideWorkToLoggerMap = {};
        this.endingWorkPromises = [];
        this.s3Config = new s3_append_1.S3Config(originalConfig);
        var now = new Date();
        var baseKey = originalConfig.s3LoggerKeyPrefix.replace(/\/?$/gi, '');
        var folder = now.format('YYYY-MM-DD');
        var uniqueID = now.format('hh:mm:ss.SS');
        this.generalKey = baseKey + "/" + folder + "/" + uniqueID + ".txt";
        this.workKeyPrefix = baseKey + "/" + folder + "/work/";
        this.logger = new s3_append_1.S3Append(this.s3Config, this.generalKey);
    }
    S3Logger.prototype.log = function (message, level) {
        this.doLog(this.logger, message, level);
    };
    S3Logger.prototype.logInsideWork = function (work, message, level) {
        var logger = this.getWorkLogger(true, work);
        this.doLog(logger, message, level);
    };
    S3Logger.prototype.logOutsideWork = function (work, message, level) {
        var logger = this.getWorkLogger(false, work);
        this.doLog(logger, message, level);
    };
    S3Logger.prototype.workEnded = function (work) {
        if (work.parentID) {
            return es6_promise_1.Promise.resolve();
        }
        return consolidate_logs_1.default(this.originalConfig, this.workhorse, work, this.workKeyPrefix);
    };
    S3Logger.prototype.flush = function () {
        var _this = this;
        var promises = [this.logger.flush()];
        Object.keys(this.outsideWorkToLoggerMap).forEach(function (key) {
            promises.push(_this.outsideWorkToLoggerMap[key].flush());
        });
        Object.keys(this.insideWorkToLoggerMap).forEach(function (key) {
            promises.push(_this.insideWorkToLoggerMap[key].flush());
        });
        return es6_promise_1.Promise.all(promises);
    };
    S3Logger.prototype.downloadWorkLogs = function (workID) {
        var s3 = aws_util_1.createS3(this.originalConfig);
        var key = "" + this.workKeyPrefix + workID + ".txt";
        return aws_util_1.download(this.originalConfig, s3, key);
    };
    S3Logger.prototype.doLog = function (logger, message, level) {
        var _a = node_workhorse_1.ConsoleLogger.formatMessage(message, level), formattedMessage = _a[0], parsedLevel = _a[1];
        // Ignore
        if (this.level && this.level < parsedLevel) {
            return;
        }
        // Keep logs to one-line for simplicity of parsing, etc
        if (formattedMessage.indexOf('\n') >= 0) {
            formattedMessage = JSON.stringify(formattedMessage);
        }
        logger.appendWithDate(formattedMessage);
    };
    S3Logger.prototype.getWorkLogger = function (isInside, work) {
        var map = isInside ? this.insideWorkToLoggerMap : this.outsideWorkToLoggerMap;
        var found = map[work.id];
        if (!found) {
            var prefix = isInside ? '' : '-outside';
            found = map[work.id] = new s3_append_1.S3Append(this.s3Config, "" + this.workKeyPrefix + work.id + prefix + ".txt");
        }
        return found;
    };
    return S3Logger;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = S3Logger;
//# sourceMappingURL=s3-logger.js.map