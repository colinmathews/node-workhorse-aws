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
// TODO: Create specs for serialization/deserialization
// TODO: In addition to calculator specs, create specs to put/get and batch
describe('DynamoDB', function () {
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
    before(function () {
        var awsConfig = getAWSConfig();
        subject = new node_workhorse_1.Workhorse(new node_workhorse_1.Config({
            stateManager: new dynamodb_state_manager_1.default(awsConfig)
        }));
    });
    describe('#run', function () {
        it('should add two numbers', function () {
            this.timeout(20000);
            return subject.run(baseWorkPath + "calculator", { x: 1, y: 2 })
                .then(function (work) {
                chai_1.assert.isNotNull(work.result);
                chai_1.assert.equal(work.result.result, 3);
            });
        });
        it('should recurse a few times', function () {
            this.timeout(95000);
            return subject.run(baseWorkPath + "calculator", { x: 1, y: 2, recurse: 3 })
                .then(function (work) {
                return subject.state.load(work.id)
                    .then(function (work) {
                    return work.deep(subject);
                });
            })
                .then(function (deep) {
                chai_1.assert.isNotNull(deep.result);
                chai_1.assert.equal(deep.finalizerResult.result, 9);
                chai_1.assert.equal(deep.ancestorLevel, 0);
                chai_1.assert.equal(deep.children[0].ancestorLevel, 1);
                chai_1.assert.equal(deep.children[0].children[0].ancestorLevel, 2);
                chai_1.assert.equal(deep.children[0].children[0].children[0].ancestorLevel, 3);
            });
        });
        it('should spawn child work test', function () {
            this.timeout(60000);
            return subject.run(baseWorkPath + "calculator", { x: 1, y: 2, twice: true })
                .then(function (work) {
                return subject.state.load(work.id);
            })
                .then(function (work) {
                chai_1.assert.isNotNull(work.result);
                chai_1.assert.equal(work.result.result, 3);
                chai_1.assert.lengthOf(work.childrenIDs, 1);
                chai_1.assert.lengthOf(work.finishedChildrenIDs, 1);
            });
        });
    });
});
//# sourceMappingURL=dynamodb-spec.js.map