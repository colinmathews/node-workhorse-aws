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

describe('Lambda', () => {
  let subject: Workhorse;
  let baseWorkPath = 'working://dist/test/test-work/';
  let rawConfig;

  function getAWSConfig():AWSConfig {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    return new AWSConfig(rawConfig);
  }

  function waitForWork(workID:string): Promise<Work> {
    let fnWait = () => {
      return new Promise((ok, fail) => {
        setTimeout(ok, 2000);
      })
      .then(() => {
        return waitForWork(workID);
      });
    };

    return subject.state.load(workID)
    .then((work) => {
      if (!work.result || !work.result.ended || work.childrenIDs.length > work.finishedChildrenIDs.length) {
        return fnWait();
      }

      // Wait a bit to ensure everything's been closed up
      return new Promise((ok, fail) => {
        setTimeout(ok, 4000);
      })
      .then(() => {
        return subject.state.load(workID);
      });
    });
  }

  before(function() {
    let config = getAWSConfig();
    var router = new LambdaRouter(config);
    var logger = new S3Logger(config);
    var stateManager = new DynamoDBStateManager(config);
    subject = new Workhorse(new Config({
      stateManager: stateManager,
      logger: logger,
      router: router
    }));
  });

  describe('#run', () => {
    it('should add two numbers', function() {
      if (!rawConfig.lambdaEventsS3BaseKey) {
        return this.skip();
      }

      this.timeout(60000);
      let work: Work;
      return subject.route(`${baseWorkPath}calculator`, { x: 1, y: 2 })
      .then((result: Work) => {
        work = result;
        return waitForWork(work.id);
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

      this.timeout(60000);
      let work: Work;
      return subject.route(`${baseWorkPath}calculator`, { x: 1, y: 2, twice: true })
      .then((result: Work) => {
        work = result;
        console.log("Work id = " + work.id);
        return waitForWork(work.id);
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

    it('should handle lots of requests all at once', function() {
      if (!rawConfig.lambdaEventsS3BaseKey) {
        return this.skip();
      }

      this.timeout(120 * 1000);
      let work: Work;
      return subject.route(`${baseWorkPath}calculator`, { x: 1, y: 2, recurse: 30 })
        .then((result: Work) => {
          work = result;
          console.log("Work id = " + work.id);
          return waitForWork(work.id);
        })
        .then(() => {
          console.log('todo: ' + JSON.stringify(work, null, 2));
        })
    });

    xit('should check on the logs of a piece of work', function() {
      let workID = '2016-03-13-c040c182-2cdf-44aa-9669-b1f3437a46b8';
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
