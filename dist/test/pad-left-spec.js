"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
var chai_1 = require('chai');
var pad_left_1 = require('../lib/util/pad-left');
describe('Pad', function () {
    describe('#left', function () {
        it('should not add padding', function () {
            var result = pad_left_1.default('abc', 0);
            chai_1.assert.equal(result, 'abc');
        });
        it('should add padding', function () {
            var result = pad_left_1.default('abc', 3);
            chai_1.assert.equal(result, '   abc');
        });
        it('should allow special padding character', function () {
            var result = pad_left_1.default('abc', 2, 'x');
            chai_1.assert.equal(result, 'xxabc');
        });
    });
});
//# sourceMappingURL=pad-left-spec.js.map