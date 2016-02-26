require('source-map-support').install({
  handleUncaughtExceptions: false
});
require('date-format-lite');
import { assert } from 'chai';
import { produceLogs } from '../lib/util/consolidate-logs';

describe('Consolidate Logs', () => {
  describe('#basic', () => {
    let list = [{
      contents: ['c', 'a', 'b'].join('\n'),
      work: {
        id: 1,
        children: []
      }
    }];

    it('should produce the right logs', function(){
      let result = produceLogs(list, list[0], 0);
      assert.lengthOf(result, 3);
      assert.equal(result[0], 'a');
      assert.equal(result[1], 'b');
      assert.equal(result[2], 'c');
    });
  });

  describe('#one-level-deep', () => {
    let list = [{
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

    it('should produce the right logs', function(){
      let result = produceLogs(list, list[0], 0, 1);
      assert.lengthOf(result, 6);
      assert.equal(result[3], ' --- START WORK 2 ---');
      assert.equal(result[4], ' child-a');
      assert.equal(result[5], ' --- END WORK 2 ---');
    });
  });

  describe('#several-levels-deep', () => {
    let list = [{
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

    it('should produce the right logs', function(){
      let result = produceLogs(list, list[0], 0, 1);
      assert.lengthOf(result, 15);
      assert.equal(result[3], " --- START WORK 2 ---");
      assert.equal(result[4], " child-a");
      assert.equal(result[5], "  --- START WORK 3 ---");
      assert.equal(result[6], "  child-b");
      assert.equal(result[7], "   --- START WORK 4 ---");
      assert.equal(result[8], "   child-c");
      assert.equal(result[9], "   --- END WORK 4 ---");
      assert.equal(result[10], "  --- END WORK 3 ---");
      assert.equal(result[11], "  --- START WORK 5 ---");
      assert.equal(result[12], "  child-d");
      assert.equal(result[13], "  --- END WORK 5 ---");
      assert.equal(result[14], " --- END WORK 2 ---");
    });
  });
});
