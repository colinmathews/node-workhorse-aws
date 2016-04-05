"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
require('date-format-lite');
var base_1 = require('./base');
var lambda_event_1 = require('../../models/lambda-event');
var https = require('https');
var url = require('url');
function handleGatewayResponse(res, ok, fail) {
    var buffers = [];
    var totalLength = 0;
    res.on('data', function (d) {
        buffers.push(d);
        totalLength += d.length;
    });
    res.on('end', function (d) {
        var buffer = Buffer.concat(buffers, totalLength);
        var raw = buffer.toString();
        try {
            var json = JSON.parse(raw);
            if (res.statusCode !== 200) {
                return fail(new Error("Failed with status " + res.statusCode + ": " + json.message));
            }
            ok(json);
        }
        catch (err) {
            fail(new Error("Failed to parse response as json: " + raw));
        }
    });
}
function handleTimeout(req, timeoutMillis, fail) {
    req.on('socket', function (socket) {
        socket.setTimeout(timeoutMillis);
        socket.on('timeout', function () {
            fail(new Error('Request timed out'));
            req.abort();
        });
    });
}
var APIGatewayLambdaSource = (function (_super) {
    __extends(APIGatewayLambdaSource, _super);
    function APIGatewayLambdaSource() {
        _super.apply(this, arguments);
    }
    APIGatewayLambdaSource.prototype.sendWorkToLambda = function (event) {
        var args = url.parse(this.config.lambdaEventsAPIGatewayPostUrl + "/work/" + event.workID);
        args.method = 'POST';
        args.headers = args.headers || {};
        args.headers['x-api-key'] = this.config.lambdaEventsAPIGatewayKey;
        var postData = {
            runFinalizer: event.runFinalizer
        };
        return new Promise(function (ok, fail) {
            var req = https.request(args, function (res) {
                handleGatewayResponse(res, ok, fail);
            });
            req.on('error', function (err) {
                fail(err);
            });
            handleTimeout(req, 1000 * 30, fail);
            req.write(JSON.stringify(postData));
            req.end();
        });
    };
    APIGatewayLambdaSource.prototype.parseRequest = function (request) {
        return new Promise(function (ok, fail) {
            ok(new lambda_event_1.default(request.workID, request.body.runFinalizer === true));
        });
    };
    return APIGatewayLambdaSource;
}(base_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = APIGatewayLambdaSource;
//# sourceMappingURL=api-gateway.js.map