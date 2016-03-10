"use strict";
var es6_promise_1 = require('es6-promise');
var aws_sdk_1 = require('aws-sdk');
var S3StateManager = (function () {
    function S3StateManager(config) {
        this.config = config;
        aws_sdk_1.config.update({
            credentials: new aws_sdk_1.Credentials(config.accessKeyId, config.secretAccessKey),
            region: config.region
        });
    }
    S3StateManager.prototype.save = function (work) {
        var _this = this;
        return this.readDB()
            .then(function () {
            return _this.saveToMap(work);
        })
            .then(function () {
            return _this.writeDB();
        });
    };
    S3StateManager.prototype.saveToMap = function (work) {
        if (!work.id) {
            work.id = (S3StateManager.nextID++).toString();
        }
        S3StateManager.stateMap[work.id] = work;
    };
    S3StateManager.prototype.saveAll = function (work) {
        var _this = this;
        return this.readDB()
            .then(function () {
            work.forEach(function (row) {
                _this.saveToMap(row);
            });
        })
            .then(function () {
            return _this.writeDB();
        });
    };
    S3StateManager.prototype.load = function (id) {
        return this.readDB()
            .then(function () {
            return S3StateManager.stateMap[id];
        });
    };
    S3StateManager.prototype.loadAll = function (ids) {
        return this.readDB()
            .then(function () {
            return ids.map(function (id) {
                return S3StateManager.stateMap[id];
            })
                .filter(function (row) {
                return !!row;
            });
        });
    };
    S3StateManager.prototype.writeDB = function () {
        var _this = this;
        var s3 = new aws_sdk_1.S3();
        var key = this.config.s3StateKeyPrefix + ".json";
        var json = JSON.stringify(S3StateManager.stateMap, null, 2);
        var args = {
            Bucket: this.config.bucket,
            Key: key,
            ContentType: 'application/json',
            Body: new Buffer(json),
            ACL: 'private'
        };
        return new es6_promise_1.Promise(function (ok, fail) {
            _this.workhorse.logger.log("Saving state database to " + key + "...");
            s3.putObject(args, function (err, data) {
                if (err) {
                    return fail(err);
                }
                ok();
            });
        });
    };
    S3StateManager.prototype.readDB = function (force) {
        var _this = this;
        if (S3StateManager.stateMap && force !== true) {
            return es6_promise_1.Promise.resolve(S3StateManager.stateMap);
        }
        var s3 = new aws_sdk_1.S3();
        var key = this.config.s3StateKeyPrefix + ".json";
        var args = {
            Bucket: this.config.bucket,
            Key: decodeURIComponent(key.replace(/\+/g, " "))
        };
        return new es6_promise_1.Promise(function (ok, fail) {
            _this.workhorse.logger.log("Loading state database from S3: " + key + "...");
            s3.getObject(args, function (err, data) {
                if (err) {
                    if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
                        _this.workhorse.logger.log('State database not found, starting fresh');
                        S3StateManager.stateMap = {};
                        S3StateManager.nextID = S3StateManager.calculateNextID();
                        return ok(S3StateManager.stateMap);
                    }
                    return fail(err);
                }
                var raw = data.Body.toString();
                S3StateManager.stateMap = JSON.parse(raw);
                S3StateManager.nextID = S3StateManager.calculateNextID();
                _this.workhorse.logger.log('State database loaded');
                ok(S3StateManager.stateMap);
            });
        });
    };
    S3StateManager.calculateNextID = function () {
        var nextID = 1;
        var state = S3StateManager.stateMap;
        if (!state) {
            return nextID;
        }
        return Object.keys(state).reduce(function (result, key) {
            var id = parseInt(key, 10);
            if (!isNaN(id) && id >= result) {
                return id + 1;
            }
            return result;
        }, 1);
    };
    S3StateManager.stateMap = null;
    return S3StateManager;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = S3StateManager;
//# sourceMappingURL=s3-state-manager.js.map