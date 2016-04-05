"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
require('date-format-lite');
var path = require('path');
var fs = require('fs');
var util = require('util');
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
    function waitForWork(workID) {
        var fnWait = function () {
            return new Promise(function (ok, fail) {
                setTimeout(ok, 2000);
            })
                .then(function () {
                return waitForWork(workID);
            });
        };
        return subject.state.load(workID)
            .then(function (work) {
            if (!work.result || !work.result.ended || work.childrenIDs.length > work.finishedChildrenIDs.length) {
                return fnWait();
            }
            // Wait a bit to ensure everything's been closed up
            return new Promise(function (ok, fail) {
                setTimeout(ok, 4000);
            })
                .then(function () {
                return subject.state.load(workID);
            });
        });
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
            this.timeout(60000);
            var work;
            return subject.route(baseWorkPath + "calculator", { x: 1, y: 2 })
                .then(function (result) {
                work = result;
                return waitForWork(work.id);
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
            this.timeout(60000);
            var work;
            return subject.route(baseWorkPath + "calculator", { x: 1, y: 2, twice: true })
                .then(function (result) {
                work = result;
                console.log("Work id = " + work.id);
                return waitForWork(work.id);
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
        it('should handle errors properly', function () {
            if (!rawConfig.lambdaEventsS3BaseKey) {
                return this.skip();
            }
            this.timeout(60000);
            var work;
            return subject.route(baseWorkPath + "calculator", { x: 1, y: 2, errorOnChildRun: true, recurse: 1 })
                .then(function (result) {
                work = result;
                console.log("Work id = " + work.id);
                return waitForWork(work.id);
            })
                .then(function () {
                return subject.state.load(work.id);
            })
                .then(function (result) {
                return result.deep(subject);
            })
                .then(function (result) {
                console.log('todo: ' + JSON.stringify(result, null, 2));
                // assert.lengthOf(result.childrenIDs, 1);
                // assert.lengthOf(result.finishedChildrenIDs, 1);
                // assert.equal(result.finishedChildrenIDs[0], result.childrenIDs[0]);
                // assert.isNotNull(result.result);
                // assert.isNotNull(result.result.ended);
                // assert.isNull(result.result.error);
                // assert.isOk(result.finalizerResult);
            });
        });
        it('should handle lots of requests all at once', function () {
            if (!rawConfig.lambdaEventsS3BaseKey) {
                return this.skip();
            }
            this.timeout(120 * 1000);
            var work;
            var numRecurses = 10;
            return subject.route(baseWorkPath + "calculator", { x: 1, y: 2, recurse: numRecurses })
                .then(function (result) {
                work = result;
                console.log("Work id = " + work.id);
                return waitForWork(work.id);
            })
                .then(function () {
                return subject.state.load(work.id)
                    .then(function (work) {
                    return work.deep(subject);
                });
            })
                .then(function (deep) {
                chai_1.assert.equal(deep.ancestorLevel, 0);
                chai_1.assert.equal(deep.finalizerResult.result, 3 * numRecurses);
                chai_1.assert.equal(deep.children[0].ancestorLevel, 1);
                chai_1.assert.equal(deep.children[0].children[0].ancestorLevel, 2);
                chai_1.assert.equal(deep.children[0].children[0].children[0].ancestorLevel, 3);
                // Make sure the inner-most child has finished running
                var fnLeaf = function (work) {
                    if (work.children.length === 0) {
                        return work;
                    }
                    return fnLeaf(work.children[0]);
                };
                var leaf = fnLeaf(deep);
                chai_1.assert.isNotNull(leaf.result);
                chai_1.assert.isNotNull(leaf.result.ended);
                chai_1.assert.isTrue(deep.finalizerResult.ended >= leaf.result.ended);
            });
        });
        // it('should check on the logs of a piece of work', function() {
        //   this.timeout(30 * 1000);
        //   let workID = '2016-04-05-8a26eb49-b6f6-4835-90d2-2b1599baf93f';
        //   return (<any>subject.logger).downloadWorkLogs(workID)
        //   .then((result) => {
        //     console.log(result);
        //     return subject.state.load(workID)
        //     .then((work) => {
        //       return work.deep(subject);
        //     });
        //   })
        //   .then((result) => {
        //     console.log(JSON.stringify(result, null, 2));
        //   });
        // });
    });
});
//# sourceMappingURL=lambda-spec.js.map