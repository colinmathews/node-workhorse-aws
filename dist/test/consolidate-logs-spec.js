"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
require('date-format-lite');
var chai_1 = require('chai');
var consolidate_logs_1 = require('../lib/util/consolidate-logs');
describe('Consolidate Logs', function () {
    describe('#basic', function () {
        var list = [{
                contents: ['c', 'a', 'b'].join('\n'),
                work: {
                    id: 1,
                    children: []
                }
            }];
        it('should produce the right logs', function () {
            var result = consolidate_logs_1.produceLogs(list, list[0], 0);
            chai_1.assert.lengthOf(result, 3);
            chai_1.assert.equal(result[0], 'a');
            chai_1.assert.equal(result[1], 'b');
            chai_1.assert.equal(result[2], 'c');
        });
    });
    describe('#one-level-deep', function () {
        var list = [{
                contents: ['c', 'a', 'b'].join('\n'),
                work: {
                    id: 1,
                    children: [{ id: 2 }]
                }
            }, {
                contents: ['child-a'].join('\n'),
                work: {
                    id: 2,
                    children: []
                }
            }];
        it('should produce the right logs', function () {
            var result = consolidate_logs_1.produceLogs(list, list[0], 0, 1);
            chai_1.assert.lengthOf(result, 6);
            chai_1.assert.equal(result[3], ' --- START WORK 2 ---');
            chai_1.assert.equal(result[4], ' child-a');
            chai_1.assert.equal(result[5], ' --- END WORK 2 ---');
        });
    });
    describe('#several-levels-deep', function () {
        var list = [{
                contents: ['c', 'a', 'b'].join('\n'),
                work: {
                    id: 1,
                    children: [{ id: 2 }]
                }
            }, {
                contents: ['child-a'].join('\n'),
                work: {
                    id: 2,
                    children: [{ id: 3 }, { id: 5 }]
                }
            }, {
                contents: ['child-b'].join('\n'),
                work: {
                    id: 3,
                    children: [{ id: 4 }]
                }
            }, {
                contents: ['child-c'].join('\n'),
                work: {
                    id: 4,
                    children: []
                }
            }, {
                contents: ['child-d'].join('\n'),
                work: {
                    id: 5,
                    children: []
                }
            }];
        it('should produce the right logs', function () {
            var result = consolidate_logs_1.produceLogs(list, list[0], 0, 1);
            chai_1.assert.lengthOf(result, 15);
            chai_1.assert.equal(result[3], " --- START WORK 2 ---");
            chai_1.assert.equal(result[4], " child-a");
            chai_1.assert.equal(result[5], "  --- START WORK 3 ---");
            chai_1.assert.equal(result[6], "  child-b");
            chai_1.assert.equal(result[7], "   --- START WORK 4 ---");
            chai_1.assert.equal(result[8], "   child-c");
            chai_1.assert.equal(result[9], "   --- END WORK 4 ---");
            chai_1.assert.equal(result[10], "  --- END WORK 3 ---");
            chai_1.assert.equal(result[11], "  --- START WORK 5 ---");
            chai_1.assert.equal(result[12], "  child-d");
            chai_1.assert.equal(result[13], "  --- END WORK 5 ---");
            chai_1.assert.equal(result[14], " --- END WORK 2 ---");
        });
    });
    describe('#same-timestamps', function () {
        var now = new Date();
        var formattedDate = now.format('YYYY-MM-DD hh:mm:ss.SS');
        var list = [{
                contents: [(formattedDate + " c"), (formattedDate + " a"), (formattedDate + " b")].join('\n'),
                work: {
                    id: 1,
                    children: []
                }
            }];
        it('should keep in original index order because timestamps match', function () {
            var result = consolidate_logs_1.produceLogs(list, list[0], 0);
            chai_1.assert.lengthOf(result, 3);
            chai_1.assert.equal(result[0], formattedDate + " c");
            chai_1.assert.equal(result[1], formattedDate + " a");
            chai_1.assert.equal(result[2], formattedDate + " b");
        });
    });
});
//# sourceMappingURL=consolidate-logs-spec.js.map