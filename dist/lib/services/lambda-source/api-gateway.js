"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
require('date-format-lite');
var base_1 = require('./base');
var APIGatewayLambdaSource = (function (_super) {
    __extends(APIGatewayLambdaSource, _super);
    function APIGatewayLambdaSource() {
        _super.apply(this, arguments);
    }
    APIGatewayLambdaSource.prototype.sendWorkToLambda = function (event) {
        throw new Error('todo: Not implemented yet');
    };
    APIGatewayLambdaSource.prototype.parseRequest = function (request) {
        var json = JSON.stringify(request, null, 2);
        console.log(json);
        throw new Error('todo: ' + json);
    };
    return APIGatewayLambdaSource;
}(base_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = APIGatewayLambdaSource;
//# sourceMappingURL=api-gateway.js.map