"use strict";
function logFilePathBase(workKeyPrefix, workID) {
    var first = workID.substring(0, 7);
    return "" + workKeyPrefix + first + "/" + workID;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = logFilePathBase;
//# sourceMappingURL=log-file-naming.js.map