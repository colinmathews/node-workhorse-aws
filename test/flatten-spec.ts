require('source-map-support').install({
  handleUncaughtExceptions: false
});
import { assert } from 'chai';
import flatten from '../lib/util/flatten';

describe('Pad', () => {
  it('should flatten an already-flat array', function(){
    let result = flatten(['a', 'b', 'c']);
    assert.lengthOf(result, 3);
    assert.equal(result[0], 'a');
    assert.equal(result[1], 'b');
    assert.equal(result[2], 'c');
  });

  it('should flatten an array of arrays', function(){
    let result = flatten([['a'], ['b'], ['c']]);
    assert.lengthOf(result, 3);
    assert.equal(result[0], 'a');
    assert.equal(result[1], 'b');
    assert.equal(result[2], 'c');
  });

  it('should flatten a mix of arrays', function(){
    let result = flatten([['a'], 'b', ['c']]);
    assert.lengthOf(result, 3);
    assert.equal(result[0], 'a');
    assert.equal(result[1], 'b');
    assert.equal(result[2], 'c');
  });

  it('should flatten deeply nested arrays', function(){
    let result = flatten([['a'], [[['b']]], ['c']]);
    assert.lengthOf(result, 3);
    assert.equal(result[0], 'a');
    assert.equal(result[1], 'b');
    assert.equal(result[2], 'c');
  });
});
