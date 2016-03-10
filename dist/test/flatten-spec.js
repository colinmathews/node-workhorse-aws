"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
var chai_1 = require('chai');
var flatten_1 = require('../lib/util/flatten');
describe('Pad', function () {
    it('should flatten an already-flat array', function () {
        var result = flatten_1.default(['a', 'b', 'c']);
        chai_1.assert.lengthOf(result, 3);
        chai_1.assert.equal(result[0], 'a');
        chai_1.assert.equal(result[1], 'b');
        chai_1.assert.equal(result[2], 'c');
    });
    it('should flatten an array of arrays', function () {
        var result = flatten_1.default([['a'], ['b'], ['c']]);
        chai_1.assert.lengthOf(result, 3);
        chai_1.assert.equal(result[0], 'a');
        chai_1.assert.equal(result[1], 'b');
        chai_1.assert.equal(result[2], 'c');
    });
    it('should flatten a mix of arrays', function () {
        var result = flatten_1.default([['a'], 'b', ['c']]);
        chai_1.assert.lengthOf(result, 3);
        chai_1.assert.equal(result[0], 'a');
        chai_1.assert.equal(result[1], 'b');
        chai_1.assert.equal(result[2], 'c');
    });
    it('should flatten deeply nested arrays', function () {
        var result = flatten_1.default([['a'], [[['b']]], ['c']]);
        chai_1.assert.lengthOf(result, 3);
        chai_1.assert.equal(result[0], 'a');
        chai_1.assert.equal(result[1], 'b');
        chai_1.assert.equal(result[2], 'c');
    });
});
//# sourceMappingURL=flatten-spec.js.map