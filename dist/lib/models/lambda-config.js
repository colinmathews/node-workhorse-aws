"use strict";
var LambdaConfig = (function () {
    function LambdaConfig(aws, props) {
        var _this = this;
        if (props === void 0) { props = {}; }
        this.aws = aws;
        Object.keys(props).forEach(function (key) {
            _this[key] = props[key];
        });
    }
    return LambdaConfig;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LambdaConfig;
//# sourceMappingURL=lambda-config.js.map