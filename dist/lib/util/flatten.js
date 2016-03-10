"use strict";
function flatten(list) {
    return list.reduce(function (result, row) {
        if (row instanceof Array) {
            var step1 = result.concat(row);
            return flatten(step1);
        }
        result.push(row);
        return result;
    }, []);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = flatten;
//# sourceMappingURL=flatten.js.map