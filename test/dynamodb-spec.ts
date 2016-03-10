require('source-map-support').install({
  handleUncaughtExceptions: false
});
require('date-format-lite');
let path = require('path');
let fs = require('fs');
import { assert } from 'chai';
import { Workhorse, Config, Work, LogLevel } from 'node-workhorse';
import AWSConfig from '../lib/models/aws-config';
import DynamoDBStateManager from '../lib/services/dynamodb-state-manager';

// TODO: Create specs for serialization/deserialization
// TODO: In addition to calculator specs, create specs to put/get and batch

describe('DynamoDB', () => {
  let subject : Workhorse;
  let baseWorkPath = 'working://dist/test/test-work/';

  function getAWSConfig() {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    let rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    return new AWSConfig(rawConfig);
  }

  before(function () {
    let awsConfig = getAWSConfig();
    subject = new Workhorse(new Config({
      stateManager: new DynamoDBStateManager(awsConfig)
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
        assert.lengthOf(work.childrenIDs, 1);
      });
    });
  });
});
