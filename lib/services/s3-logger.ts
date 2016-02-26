require('date-format-lite');
import { Promise } from 'es6-promise';
import { Work, Logger, Workhorse, LogLevel, ConsoleLogger } from 'node-workhorse';
import S3Config from '../models/s3-config';
import { S3Config as LoggerS3Config, S3Append } from 's3-append';
import consolidateLogs from '../util/consolidate-logs';

export default class S3Logger implements Logger {
  workhorse: Workhorse;
  level: LogLevel;
  uniqueID: string;
  generalKey: string;
  workKeyPrefix: string;
  private s3Config:LoggerS3Config;
  private logger:S3Append;
  private outsideWorkToLoggerMap = {};
  private insideWorkToLoggerMap = {};
  private endingWorkPromises:Promise<any>[] = [];

  constructor(public originalConfig: S3Config) {
    this.s3Config = new LoggerS3Config(originalConfig);
    let now = new Date();
    this.uniqueID = (<any>now).format('YYYY-MM-DD hh:mm:ss.SS');
    this.generalKey = `${originalConfig.s3LoggerKeyPrefix}${this.uniqueID}.txt`;
    this.workKeyPrefix = `${originalConfig.s3LoggerKeyPrefix}work/`;
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

  private doLog(logger:S3Append, message:string, level?: LogLevel|Error) {
    let err;
    [level, err] = ConsoleLogger.parseLevel(level);
    let formattedMessage = ConsoleLogger.formatMessage(message, level);

    // Ignore
    if (this.level && this.level < level) {
      return;
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
