require('source-map-support').install({
  handleUncaughtExceptions: false
});
import { assert } from 'chai';
import padLeft from '../lib/util/pad-left';

describe('Pad', () => {
  describe('#left', () => {
    it('should not add padding', function(){
      let result = padLeft('abc', 0);
      assert.equal(result, 'abc');
    });

    it('should add padding', function(){
      let result = padLeft('abc', 3);
      assert.equal(result, '   abc');
    });

    it('should allow special padding character', function(){
      let result = padLeft('abc', 2, 'x');
      assert.equal(result, 'xxabc');
    });
  });
});
