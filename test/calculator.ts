require('source-map-support').install({
  handleUncaughtExceptions: false
});
let path = require('path');
let fs = require('fs');
import { assert } from 'chai';
import { Workhorse, Config, Work, LogLevel } from 'node-workhorse';
import S3Config from '../lib/models/s3-config';
import S3StateManager from '../lib/services/s3-state-manager';

describe('Calculator', () => {
  let subject : Workhorse;
  let baseWorkPath = `${__dirname}/test-work/`;

  before(function () {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    let rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    let s3Config = new S3Config(rawConfig);
    subject = new Workhorse(new Config({
      stateManager: new S3StateManager(s3Config)
    }));
  });

  describe('#run', () => {
    it('should add two numbers', function(){
      this.timeout(10000);
      return subject.run(`${baseWorkPath}calculator`, { x: 1, y: 2 })
      .then((work: Work) => {
        assert.isNotNull(work.result);
        assert.equal(work.result.result, 3);
      });
    });

    it('should spawn child work', function(){
      this.timeout(10000);
      return subject.run(`${baseWorkPath}calculator`, { x: 1, y: 2, twice: true })
      .then((work: Work) => {
        assert.isNotNull(work.result);
        assert.equal(work.result.result, 3);
      });
    });

    it('should fail if numbers not used', function(){
      this.timeout(10000);
      return subject.run(`${baseWorkPath}calculator`, { x: 'error', y: 2 })
      .then((work: Work) => {
        assert.isNotNull(work.result);
        assert.isNull(work.result.result);
        assert.isNotNull(work.result.error);
        assert.typeOf(work.result.error, 'error');
      });
    });
  });
});
