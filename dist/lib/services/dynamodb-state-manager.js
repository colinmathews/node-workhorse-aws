"use strict";
require('date-format-lite');
var es6_promise_1 = require('es6-promise');
var node_workhorse_1 = require('node-workhorse');
var aws_sdk_1 = require('aws-sdk');
var uuid = require('node-uuid');
var util = require('util');
var flatten_1 = require('../util/flatten');
var MAX_BATCH_GET = 25;
var DATE_PREFIX = 'dynamodb-date:';
function serializeAsItem(data) {
    if (data === null) {
        return { NULL: true };
    }
    if (typeof (data) === 'string') {
        return { S: data };
    }
    if (typeof (data) === 'boolean') {
        return { BOOL: data === true };
    }
    if (typeof (data) === 'number') {
        return { N: data.toString() };
    }
    if (util.isDate(data)) {
        return { S: DATE_PREFIX + data.valueOf() };
    }
    if (data instanceof Array) {
        return { L: data.map(function (row) {
                return serializeAsItem(row);
            }) };
    }
    if (typeof (data) === 'function') {
        return;
    }
    if (typeof (data) === 'undefined') {
        return;
    }
    if (typeof (data) !== 'object') {
        throw new Error("Unexpected type: " + typeof (data));
    }
    var result = {};
    Object.keys(data).forEach(function (key) {
        var value = data[key];
        var itemValue = serializeAsItem(value);
        result[key] = itemValue;
    });
    return { M: result };
}
exports.serializeAsItem = serializeAsItem;
function deserializeDate(data) {
    var raw = data.replace(DATE_PREFIX, '');
    var millis = parseInt(raw, 10);
    return new Date(millis);
}
function deserialize(data) {
    if (data.S) {
        if (data.S.indexOf(DATE_PREFIX) === 0) {
            return deserializeDate(data.S);
        }
        return data.S;
    }
    if (data.NULL) {
        return null;
    }
    if (data.N) {
        if (data.N.indexOf('.')) {
            return parseFloat(data.N);
        }
        return parseInt(data.N, 10);
    }
    if (data.BOOL) {
        return data.BOOL === true;
    }
    if (data.L) {
        return data.L.map(function (row) {
            return deserialize(row);
        });
    }
    if (data.M) {
        var result_1 = {};
        Object.keys(data.M).forEach(function (key) {
            var value = data.M[key];
            var itemValue = deserialize(value);
            result_1[key] = itemValue;
        });
        return result_1;
    }
    throw new Error("Unexpected data to deserialize: " + JSON.stringify(data, null, 2));
}
exports.deserialize = deserialize;
var DynamoDBStateManager = (function () {
    function DynamoDBStateManager(config) {
        this.config = config;
        aws_sdk_1.config.update({
            credentials: new aws_sdk_1.Credentials(config.accessKeyId, config.secretAccessKey),
            region: config.region
        });
        this.db = new aws_sdk_1.DynamoDB();
    }
    DynamoDBStateManager.prototype.save = function (work) {
        var _this = this;
        return new es6_promise_1.Promise(function (ok, fail) {
            if (!work.id) {
                var now = new Date();
                work.id = now.format('YYYY-MM-DD-') + uuid.v4();
            }
            var request = {
                TableName: _this.config.dynamoDBWorkTable,
                Item: _this.serializeWork(work)
            };
            _this.db.putItem(request, function (err, data) {
                if (err) {
                    return fail(err);
                }
                ok();
            });
        });
    };
    DynamoDBStateManager.prototype.saveAll = function (work) {
        var _this = this;
        var promises = work.map(function (row) {
            return _this.save(row);
        });
        return es6_promise_1.Promise.all(promises);
    };
    DynamoDBStateManager.prototype.load = function (id) {
        var _this = this;
        return new es6_promise_1.Promise(function (ok, fail) {
            var request = {
                TableName: _this.config.dynamoDBWorkTable,
                Key: {
                    id: {
                        S: id
                    }
                }
            };
            _this.db.getItem(request, function (err, data) {
                if (err) {
                    return fail(err);
                }
                if (!data.Item) {
                    return ok(null);
                }
                ok(_this.deserializeWork(data.Item));
            });
        });
    };
    DynamoDBStateManager.prototype.loadAll = function (ids) {
        var _this = this;
        var requests = [];
        for (var i = 0; i < ids.length; i += MAX_BATCH_GET) {
            requests.push(ids.slice(i, MAX_BATCH_GET));
        }
        var promises = requests.map(function (row) {
            return _this.batchGet(row);
        });
        return es6_promise_1.Promise.all(promises)
            .then(function (result) {
            return flatten_1.default(result);
        });
    };
    DynamoDBStateManager.prototype.childWorkFinished = function (work, parent) {
        parent.finishedChildrenIDs.push(work.id);
        var isDone = parent.finishedChildrenIDs.length === parent.childrenIDs.length;
        return this.save(parent)
            .then(function () {
            return isDone;
        });
    };
    DynamoDBStateManager.prototype.serializeWork = function (work) {
        return serializeAsItem({
            id: work.id,
            workLoadHref: work.workLoadHref,
            ancestorLevel: work.ancestorLevel,
            input: work.input,
            result: work.result,
            finalizerResult: work.finalizerResult,
            parentID: work.parentID,
            childrenIDs: work.childrenIDs,
            finishedChildrenIDs: work.finishedChildrenIDs
        }).M;
    };
    DynamoDBStateManager.prototype.deserializeWork = function (data) {
        var work = new node_workhorse_1.Work();
        var raw = deserialize({ M: data });
        Object.keys(raw).forEach(function (key) {
            work[key] = raw[key];
        });
        return work;
    };
    DynamoDBStateManager.prototype.batchGet = function (ids) {
        var _this = this;
        return new es6_promise_1.Promise(function (ok, fail) {
            var keys = ids.map(function (row) {
                return {
                    id: {
                        S: row
                    }
                };
            });
            var request = { RequestItems: {} };
            request.RequestItems[_this.config.dynamoDBWorkTable] = {
                Keys: keys
            };
            _this.db.batchGetItem(request, function (err, data) {
                if (err) {
                    return fail(err);
                }
                var tableData = data.Responses[_this.config.dynamoDBWorkTable];
                var works = tableData.map(function (row) {
                    return _this.deserializeWork(row);
                });
                ok(works);
            });
        });
    };
    return DynamoDBStateManager;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DynamoDBStateManager;
//# sourceMappingURL=dynamodb-state-manager.js.map