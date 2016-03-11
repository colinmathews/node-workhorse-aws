"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
require('date-format-lite');
var base_1 = require('./base');
var aws_util_1 = require('../../util/aws-util');
var S3LambdaSource = (function (_super) {
    __extends(S3LambdaSource, _super);
    function S3LambdaSource() {
        _super.apply(this, arguments);
    }
    S3LambdaSource.prototype.sendWorkToLambda = function (event) {
        var s3 = aws_util_1.createS3(this.config.aws);
        var baseKey = this.config.s3BaseKey.replace(/\/?$/gi, '');
        var now = new Date();
        var folder = now.format('YYYY-MM-DD');
        var uniqueID = now.format('hh:mm:ss.SS');
        var key = baseKey + "/" + folder + "/" + uniqueID + ".js";
        return aws_util_1.upload(this.config.aws, s3, key, JSON.stringify(event), 'application/json');
    };
    S3LambdaSource.prototype.parseRequest = function (request) {
        var s3 = aws_util_1.createS3(this.config.aws);
        return aws_util_1.download(this.config.aws, s3, request.object.key)
            .then(function (result) {
            return JSON.parse(result);
        });
    };
    return S3LambdaSource;
}(base_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = S3LambdaSource;
//# sourceMappingURL=s3.js.map