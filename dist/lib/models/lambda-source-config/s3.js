"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var base_1 = require('./base');
var S3LambdaSourceConfig = (function (_super) {
    __extends(S3LambdaSourceConfig, _super);
    function S3LambdaSourceConfig(aws, baseKey) {
        _super.call(this);
        this.aws = aws;
        this.baseKey = baseKey;
    }
    return S3LambdaSourceConfig;
}(base_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = S3LambdaSourceConfig;
//# sourceMappingURL=s3.js.map