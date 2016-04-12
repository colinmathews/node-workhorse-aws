"use strict";
function default_1(text, chars, padChar) {
    'use strict';
    if (padChar === void 0) { padChar = ' '; }
    for (var i = 0; i < chars; i++) {
        text = padChar + text;
    }
    return text;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
//# sourceMappingURL=pad-left.js.map