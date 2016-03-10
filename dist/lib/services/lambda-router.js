"use strict";
var es6_promise_1 = require('es6-promise');
var lambda_event_1 = require('../models/lambda-event');
var s3_1 = require('../models/lambda-source-config/s3');
var s3_2 = require('./lambda-source/s3');
var MemoryRouter = (function () {
    function MemoryRouter(config) {
        this.config = config;
    }
    MemoryRouter.prototype.route = function (options) {
        var _this = this;
        return this.createLambdaEvent(options.workID)
            .then(function (event) {
            return _this.sendWorkToLambda(event);
        });
    };
    MemoryRouter.prototype.routeFinalizer = function (options) {
        var _this = this;
        return this.createLambdaEvent(options.workID, true)
            .then(function (event) {
            return _this.sendWorkToLambda(event);
        });
    };
    MemoryRouter.prototype.sendWorkToLambda = function (event) {
        var source = this.getSource();
        return source.sendWorkToLambda(event);
    };
    MemoryRouter.prototype.handleLambdaRequest = function (request, context) {
        var _this = this;
        var source = this.getSource();
        var parsed;
        return source.parseRequest(request)
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
    MemoryRouter.prototype.getSource = function () {
        if (this.config instanceof s3_1.default) {
            return new s3_2.default(this.config);
        }
        throw new Error("Unexpected configuration means we couldn't find a lambda source to use");
    };
    MemoryRouter.prototype.createLambdaEvent = function (workID, runFinalizer) {
        if (runFinalizer === void 0) { runFinalizer = false; }
        return es6_promise_1.Promise.resolve(new lambda_event_1.default(workID, runFinalizer));
    };
    return MemoryRouter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemoryRouter;
//# sourceMappingURL=lambda-router.js.map