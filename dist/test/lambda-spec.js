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
var dynamodb_state_manager_1 = require('../lib/services/dynamodb-state-manager');
var lambda_router_1 = require('../lib/services/lambda-router');
var s3_logger_1 = require('../lib/services/s3-logger');
describe('Lambda', function () {
    var subject;
    var baseWorkPath = 'working://dist/test/test-work/';
    var rawConfig;
    function getAWSConfig() {
        var jsonPath = path.resolve(__dirname, '../../aws-config.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources");
        }
        rawConfig = JSON.parse(fs.readFileSync(jsonPath));
        return new aws_config_1.default(rawConfig);
    }
    before(function () {
        var config = getAWSConfig();
        var router = new lambda_router_1.default(config);
        var logger = new s3_logger_1.default(config);
        var stateManager = new dynamodb_state_manager_1.default(config);
        subject = new node_workhorse_1.Workhorse(new node_workhorse_1.Config({
            stateManager: stateManager,
            logger: logger,
            router: router
        }));
    });
    describe('#run', function () {
        it('should add two numbers', function () {
            if (!rawConfig.lambdaEventsS3BaseKey) {
                return this.skip();
            }
            this.timeout(20000);
            var work;
            return subject.route(baseWorkPath + "calculator", { x: 1, y: 2 })
                .then(function (result) {
                work = result;
                return new Promise(function (ok, fail) {
                    setTimeout(function () {
                        ok();
                    }, 18 * 1000);
                });
            })
                .then(function () {
                return subject.logger.downloadWorkLogs(work.id);
            })
                .then(function (result) {
                var lines = result.split('\n');
                chai_1.assert.include(result, 'Work succeeded');
                return subject.state.load(work.id);
            })
                .then(function (result) {
                chai_1.assert.lengthOf(result.finishedChildrenIDs, 0);
                chai_1.assert.isNotNull(result.result);
                chai_1.assert.isNotNull(result.result.ended);
                chai_1.assert.isNull(result.result.error);
                chai_1.assert.isNotOk(result.finalizerResult);
            });
        });
        it('should spawn child work', function () {
            if (!rawConfig.lambdaEventsS3BaseKey) {
                return this.skip();
            }
            this.timeout(30000);
            var work;
            return subject.route(baseWorkPath + "calculator", { x: 1, y: 2, twice: true })
                .then(function (result) {
                work = result;
                console.log("Work id = " + work.id);
                return new Promise(function (ok, fail) {
                    setTimeout(function () {
                        ok();
                    }, 28 * 1000);
                });
            })
                .then(function () {
                return subject.logger.downloadWorkLogs(work.id);
            })
                .then(function (result) {
                var lines = result.split('\n');
                chai_1.assert.include(result, 'Work succeeded');
                chai_1.assert.include(result, 'Routing child');
                chai_1.assert.include(result, 'START WORK');
                chai_1.assert.include(result, 'END WORK');
                return subject.state.load(work.id);
            })
                .then(function (result) {
                chai_1.assert.lengthOf(result.childrenIDs, 1);
                chai_1.assert.lengthOf(result.finishedChildrenIDs, 1);
                chai_1.assert.equal(result.finishedChildrenIDs[0], result.childrenIDs[0]);
                chai_1.assert.isNotNull(result.result);
                chai_1.assert.isNotNull(result.result.ended);
                chai_1.assert.isNull(result.result.error);
                chai_1.assert.isOk(result.finalizerResult);
            });
        });
        xit('should check on the logs of a piece of work', function () {
            var workID = '2016-03-13-c040c182-2cdf-44aa-9669-b1f3437a46b8';
            return subject.logger.downloadWorkLogs(workID)
                .then(function (result) {
                console.log(result);
                return subject.state.load(workID);
            })
                .then(function (result) {
                console.log(JSON.stringify(result, null, 2));
            });
        });
    });
});
//# sourceMappingURL=lambda-spec.js.map