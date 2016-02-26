require('source-map-support').install({
  handleUncaughtExceptions: false
});
require('date-format-lite');
let path = require('path');
let fs = require('fs');
import { assert } from 'chai';
import { Workhorse, Config, Work, LogLevel } from 'node-workhorse';
import AWSConfig from '../lib/models/aws-config';
import S3StateManager from '../lib/services/s3-state-manager';
import S3Logger from '../lib/services/s3-logger';
import { S3 } from 'aws-sdk';
import { createS3, download, upload, deleteFile } from'../lib/util/aws-util'

describe('Calculator', () => {
  let subject : Workhorse;
  let baseWorkPath = `${__dirname}/test-work/`;

  function getAWSConfig() {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    let rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    return new AWSConfig(rawConfig);
  }

  function downloadLogs(workID) {
    let awsConfig = getAWSConfig();
    let s3 = createS3(awsConfig);
    let key = `${awsConfig.s3LoggerKeyPrefix}work/${workID}.txt`;
    return download(awsConfig, s3, key)
    .then((raw) => {
      if (!raw) {
        return null;
      }
      return raw.split('\n');
    });
  }

  function keyExists(keySuffix) {
    let awsConfig = getAWSConfig();
    let s3 = createS3(awsConfig);
    let key = `${awsConfig.s3LoggerKeyPrefix}work/${keySuffix}`;
    return download(awsConfig, s3, key)
    .then((raw) => {
      return raw !== null;
    });
  }

  before(function () {
    let awsConfig = getAWSConfig();
    subject = new Workhorse(new Config({
      stateManager: new S3StateManager(awsConfig),
      logger: new S3Logger(awsConfig)
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
      let work;
      this.timeout(10000);
      return subject.run(`${baseWorkPath}calculator`, { x: 1, y: 2, twice: true })
      .then((result: Work) => {
        work = result;
        assert.isNotNull(work.result);
        assert.equal(work.result.result, 3);
        assert.lengthOf(work.childrenIDs, 1);
        return downloadLogs(work.id);
      })
      .then((logs) => {
        assert.isNotNull(logs);
        assert.isTrue(logs.length > 0);
        assert.include(logs[logs.length - 1], `--- END WORK ${work.childrenIDs[0]} ---`);
        let find = logs.filter((row) => {
          return row.indexOf('Finalizer succeeded') >= 0;
        });
        assert.lengthOf(find, 1);
        find = logs.filter((row) => {
          return row.indexOf('Creating child work') >= 0;
        });
        assert.lengthOf(find, 1);
        return downloadLogs(work.childrenIDs[0]);
      })
      .then((logs) => {
        assert.isNull(logs);
        return keyExists(`${work.childrenIDs[0]}-outside.txt`);
      })
      .then((exists) => {
        assert.isFalse(exists);
        return keyExists(`${work.id}-outside.txt`);
      })
      .then((exists) => {
        assert.isFalse(exists);
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
        return downloadLogs(work.id);
      })
      .then((logs) => {
        assert.lengthOf(logs, 2);
        assert.include(logs[0], 'Running work');
        assert.include(logs[1], 'ERROR');
      });
    });
  });
});
