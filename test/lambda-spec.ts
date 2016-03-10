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
import LambdaRouter from '../lib/services/lambda-router';
import S3Logger from '../lib/services/s3-logger';
import S3LambdaSourceConfig from '../lib/models/lambda-source-config/s3';

describe('Lambda', () => {
  let subject: Workhorse;
  let baseWorkPath = 'working://dist/test/test-work/';
  let rawConfig;

  function getAWSConfig() {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    return {
      raw: rawConfig,
      aws: new AWSConfig(rawConfig)
    };
  }

  before(function() {
    let config = getAWSConfig();
    var s3Config = new S3LambdaSourceConfig(config.aws, config.raw.lambdaEventsS3BaseKey);
    var router = new LambdaRouter(s3Config);
    var logger = new S3Logger(config.aws);
    var stateManager = new DynamoDBStateManager(config.aws);
    subject = new Workhorse(new Config({
      stateManager: stateManager,
      logger: logger,
      router: router
    }));
  });

  describe('#run', () => {
    xit('should add two numbers', function() {
      if (!rawConfig.lambdaEventsS3BaseKey) {
        return this.skip();
      }

      this.timeout(20000);
      let work: Work;
      return subject.route(`${baseWorkPath}calculator`, { x: 1, y: 2 })
      .then((result: Work) => {
        work = result;
        return new Promise((ok, fail) => {
          setTimeout(() => {
            ok();
          }, 18 * 1000);
        });
      })
      .then(() => {
        return (<any>subject.logger).downloadWorkLogs(work.id);
      })
      .then((result) => {
        let lines = result.split('\n');
        assert.include(result, 'Work succeeded');
        return subject.state.load(work.id);
      })
      .then((result:Work) => {
        assert.lengthOf(result.finishedChildrenIDs, 0);
        assert.isNotNull(result.result);
        assert.isNotNull(result.result.ended);
        assert.isNull(result.result.error);
        assert.isNotOk(result.finalizerResult);
      });
    });

    it('should spawn child work', function() {
      if (!rawConfig.lambdaEventsS3BaseKey) {
        return this.skip();
      }

      this.timeout(30000);
      let work: Work;
      return subject.route(`${baseWorkPath}calculator`, { x: 1, y: 2, twice: true })
      .then((result: Work) => {
        work = result;
        console.log("Work id = " + work.id);
        return new Promise((ok, fail) => {
          setTimeout(() => {
            ok();
          }, 28 * 1000);
        });
      })
      .then(() => {
        return (<any>subject.logger).downloadWorkLogs(work.id);
      })
      .then((result) => {
        let lines = result.split('\n');
        assert.include(result, 'Work succeeded');
        assert.include(result, 'Routing child');
        assert.include(result, 'START WORK');
        assert.include(result, 'END WORK');
        return subject.state.load(work.id);
      })
      .then((result: Work) => {
        assert.lengthOf(result.childrenIDs, 1);
        assert.lengthOf(result.finishedChildrenIDs, 1);
        assert.equal(result.finishedChildrenIDs[0], result.childrenIDs[0]);
        assert.isNotNull(result.result);
        assert.isNotNull(result.result.ended);
        assert.isNull(result.result.error);
        assert.isOk(result.finalizerResult);
      });
    });

    xit('should check on the logs of a piece of work', function() {
      let workID = '';
      return (<any>subject.logger).downloadWorkLogs(workID)
      .then((result) => {
        console.log(result);
        return subject.state.load(workID);
      })
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      });
    });
  });
});
