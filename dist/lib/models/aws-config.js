"use strict";
var AWSConfig = (function () {
    function AWSConfig(props) {
        var _this = this;
        if (props === void 0) { props = {}; }
        Object.keys(props).forEach(function (key) {
            _this[key] = props[key];
        });
    }
    return AWSConfig;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AWSConfig;
//# sourceMappingURL=aws-config.js.map