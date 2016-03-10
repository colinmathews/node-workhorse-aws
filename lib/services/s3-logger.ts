require('date-format-lite');
import { Promise } from 'es6-promise';
import { Work, Logger, Workhorse, LogLevel, ConsoleLogger } from 'node-workhorse';
import AWSConfig from '../models/aws-config';
import { S3Config as LoggerS3Config, S3Append } from 's3-append';
import consolidateLogs from '../util/consolidate-logs';
import { createS3, download } from'../util/aws-util'

export default class S3Logger implements Logger {
  workhorse: Workhorse;
  level: LogLevel;
  private generalKey: string;
  private workKeyPrefix: string;
  private s3Config:LoggerS3Config;
  private logger:S3Append;
  private outsideWorkToLoggerMap = {};
  private insideWorkToLoggerMap = {};
  private endingWorkPromises:Promise<any>[] = [];

  constructor(public originalConfig:AWSConfig) {
    this.s3Config = new LoggerS3Config(originalConfig);
    let now = new Date();
    let baseKey = originalConfig.s3LoggerKeyPrefix.replace(/\/?$/gi, '');
    let folder = (<any>now).format('YYYY-MM-DD');
    let uniqueID = (<any>now).format('hh:mm:ss.SS');
    this.generalKey = `${baseKey}/${folder}/${uniqueID}.txt`;
    this.workKeyPrefix = `${baseKey}/${folder}/work/`;
    this.logger = new S3Append(this.s3Config, this.generalKey);
  }

  log (message: string, level?: LogLevel|Error) {
    this.doLog(this.logger, message, level);
  }

  logInsideWork (work: Work, message: string, level?: LogLevel|Error) {
    let logger = this.getWorkLogger(true, work);
    this.doLog(logger, message, level);
  }

  logOutsideWork (work: Work, message: string, level?: LogLevel|Error) {
    let logger = this.getWorkLogger(false, work);
    this.doLog(logger, message, level);
  }

  workEnded (work:Work): Promise<any> {
    if (work.parentID) {
      return Promise.resolve();
    }
    return consolidateLogs(this.originalConfig, this.workhorse, work, this.workKeyPrefix);
  }

  flush (): Promise<any> {
    let promises = [this.logger.flush()];
    Object.keys(this.outsideWorkToLoggerMap).forEach((key) => {
      promises.push(this.outsideWorkToLoggerMap[key].flush());
    });
    Object.keys(this.insideWorkToLoggerMap).forEach((key) => {
      promises.push(this.insideWorkToLoggerMap[key].flush());
    });
    return Promise.all(promises);
  }

  downloadWorkLogs(workID:string): Promise<string> {
    let s3 = createS3(this.originalConfig);
    let key = `${this.workKeyPrefix}${workID}.txt`;
    return download(this.originalConfig, s3, key);
  }

  private doLog(logger:S3Append, message:string, level?: LogLevel|Error) {
    let [formattedMessage, parsedLevel] = ConsoleLogger.formatMessage(message, level);

    // Ignore
    if (this.level && this.level < parsedLevel) {
      return;
    }

    // Keep logs to one-line for simplicity of parsing, etc
    if (formattedMessage.indexOf('\n') >= 0) {
      formattedMessage = JSON.stringify(formattedMessage);
    }
    logger.appendWithDate(formattedMessage);
  }

  private getWorkLogger(isInside:boolean, work:Work): S3Append {
    let map = isInside ? this.insideWorkToLoggerMap : this.outsideWorkToLoggerMap;
    let found = map[work.id];
    if (!found) {
      let prefix = isInside ? '' : '-outside';
      found = map[work.id] = new S3Append(this.s3Config, `${this.workKeyPrefix}${work.id}${prefix}.txt`);
    }
    return found;
  }
}
