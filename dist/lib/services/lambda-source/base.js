"use strict";
var LambdaSourceBase = (function () {
    function LambdaSourceBase(config) {
        this.config = config;
    }
    // TODO: Use abstract methodes/class when possible
    LambdaSourceBase.prototype.sendWorkToLambda = function (event) {
        throw new Error('Subclasses must implement "sendWorkToLambda"');
    };
    LambdaSourceBase.prototype.parseRequest = function (request) {
        throw new Error('Subclasses must implement "parseRequest"');
    };
    return LambdaSourceBase;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LambdaSourceBase;
//# sourceMappingURL=base.js.map