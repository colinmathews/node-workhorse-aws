"use strict";
var es6_promise_1 = require('es6-promise');
var lambda_event_1 = require('../models/lambda-event');
var lambda_source_type_1 = require('../models/lambda-source-type');
var s3_1 = require('./lambda-source/s3');
var api_gateway_1 = require('./lambda-source/api-gateway');
var LambdaRouter = (function () {
    function LambdaRouter(config) {
        this.config = config;
    }
    LambdaRouter.prototype.route = function (options) {
        var _this = this;
        return this.createLambdaEvent(options.workID)
            .then(function (event) {
            return _this.sendWorkToLambda(event);
        });
    };
    LambdaRouter.prototype.routeFinalizer = function (options) {
        var _this = this;
        return this.createLambdaEvent(options.workID, true)
            .then(function (event) {
            return _this.sendWorkToLambda(event);
        });
    };
    LambdaRouter.prototype.sendWorkToLambda = function (event) {
        var source = this.getSourceForRouting();
        return source.sendWorkToLambda(event);
    };
    LambdaRouter.prototype.handleLambdaRequest = function (request, context) {
        var _this = this;
        var _a = this.getSourceFromRequest(request), source = _a[0], input = _a[1];
        var parsed;
        return source.parseRequest(input)
            .then(function (result) {
            parsed = result;
            return _this.workhorse.state.load(parsed.workID);
        })
            .then(function (work) {
            if (parsed.runFinalizer) {
                return _this.workhorse.runFinalizer(work);
            }
            else {
                return _this.workhorse.run(work);
            }
        })
            .then(function () {
            context.succeed();
        })
            .catch(function (err) {
            context.fail(err);
        });
    };
    LambdaRouter.prototype.getSourceForRouting = function () {
        switch (this.config.lambdaRoutingSource) {
            case lambda_source_type_1.default.S3:
                return new s3_1.default(this.config);
            case lambda_source_type_1.default.APIGateway:
                return new api_gateway_1.default(this.config);
            default:
                throw new Error("Unexpected routing source: " + this.config.lambdaRoutingSource);
        }
    };
    LambdaRouter.prototype.getSourceFromRequest = function (request) {
        var json = JSON.stringify(request, null, 2);
        console.log(json);
        throw new Error('todo: ' + json);
        // if (!request.Records) {
        //   throw new Error("Expected lambda request to have 'Records'");
        // }
        // if (request.Records.length !== 1) {
        //   throw new Error(`Expected lambda request.Records to have exactly one record. Found ${request.Records.length}`);
        // }
        // let record = request.Records[0];
        // if (record.s3) {
        //   return [new S3LambdaSource(this.config), record.s3];
        // }
        // throw new Error(`Unexpected request: ${JSON.stringify(record, null, 2)}`);
    };
    LambdaRouter.prototype.createLambdaEvent = function (workID, runFinalizer) {
        if (runFinalizer === void 0) { runFinalizer = false; }
        return es6_promise_1.Promise.resolve(new lambda_event_1.default(workID, runFinalizer));
    };
    return LambdaRouter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LambdaRouter;
//# sourceMappingURL=lambda-router.js.map