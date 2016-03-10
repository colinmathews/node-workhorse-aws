"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
require('date-format-lite');
var path = require('path');
var fs = require('fs');
var chai_1 = require('chai');
var node_workhorse_1 = require('node-workhorse');
var aws_config_1 = require('../lib/models/aws-config');
var s3_state_manager_1 = require('../lib/services/s3-state-manager');
var s3_logger_1 = require('../lib/services/s3-logger');
var aws_util_1 = require('../lib/util/aws-util');
describe('S3', function () {
    var subject;
    var baseWorkPath = 'working://dist/test/test-work/';
    function getAWSConfig() {
        var jsonPath = path.resolve(__dirname, '../../aws-config.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources");
        }
        var rawConfig = JSON.parse(fs.readFileSync(jsonPath));
        return new aws_config_1.default(rawConfig);
    }
    function keyExists(keySuffix) {
        var awsConfig = getAWSConfig();
        var s3 = aws_util_1.createS3(awsConfig);
        var key = awsConfig.s3LoggerKeyPrefix + "work/" + keySuffix;
        return aws_util_1.download(awsConfig, s3, key)
            .then(function (raw) {
            return raw !== null;
        });
    }
    before(function () {
        var awsConfig = getAWSConfig();
        subject = new node_workhorse_1.Workhorse(new node_workhorse_1.Config({
            stateManager: new s3_state_manager_1.default(awsConfig),
            logger: new s3_logger_1.default(awsConfig)
        }));
    });
    describe('#run', function () {
        it('should add two numbers', function () {
            this.timeout(10000);
            return subject.run(baseWorkPath + "calculator", { x: 1, y: 2 })
                .then(function (work) {
                chai_1.assert.isNotNull(work.result);
                chai_1.assert.equal(work.result.result, 3);
            });
        });
        it('should spawn child work and consolidate logs', function () {
            var work;
            this.timeout(10000);
            return subject.run(baseWorkPath + "calculator", { x: 1, y: 2, twice: true })
                .then(function (result) {
                work = result;
                chai_1.assert.isNotNull(work.result);
                chai_1.assert.equal(work.result.result, 3);
                chai_1.assert.lengthOf(work.childrenIDs, 1);
                return subject.logger.downloadWorkLogs(work.id);
            })
                .then(function (raw) {
                chai_1.assert.isNotNull(raw);
                var logs = raw.split('\n');
                chai_1.assert.isTrue(logs.length > 0);
                chai_1.assert.include(logs[logs.length - 1], "--- END WORK " + work.childrenIDs[0] + " ---");
                var find = logs.filter(function (row) {
                    return row.indexOf('Finalizer succeeded') >= 0;
                });
                chai_1.assert.lengthOf(find, 1, JSON.stringify(logs, null, 2));
                find = logs.filter(function (row) {
                    return row.indexOf('Creating child work') >= 0;
                });
                chai_1.assert.lengthOf(find, 1);
                return subject.logger.downloadWorkLogs(work.childrenIDs[0]);
            })
                .then(function (logs) {
                chai_1.assert.isNull(logs);
                return keyExists(work.childrenIDs[0] + "-outside.txt");
            })
                .then(function (exists) {
                chai_1.assert.isFalse(exists);
                return keyExists(work.id + "-outside.txt");
            })
                .then(function (exists) {
                chai_1.assert.isFalse(exists);
            });
        });
        it('should fail if numbers not used and log the error', function () {
            this.timeout(10000);
            return subject.run(baseWorkPath + "calculator", { x: 'error', y: 2 })
                .then(function (work) {
                chai_1.assert.isNotNull(work.result);
                chai_1.assert.isNull(work.result.result);
                chai_1.assert.isNotNull(work.result.error);
                chai_1.assert.typeOf(work.result.error, 'error');
                return subject.logger.downloadWorkLogs(work.id);
            })
                .then(function (raw) {
                var logs = raw.split('\n');
                chai_1.assert.lengthOf(logs, 2);
                chai_1.assert.include(logs[0], 'Running work');
                chai_1.assert.include(logs[1], 'ERROR');
            });
        });
    });
});
//# sourceMappingURL=s3-spec.js.map