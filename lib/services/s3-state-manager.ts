require('date-format-lite'); 
import { Promise } from 'es6-promise';
import { Work, StateManager, Workhorse} from 'node-workhorse';
import AWSConfig from '../models/aws-config';
import { S3, config as awsConfig, Credentials } from 'aws-sdk';

export default class S3StateManager implements StateManager {
  workhorse: Workhorse;
  private static stateMap = null;
  private static nextNumericID: number = 0;
  private static nextID: string;

  constructor(public config:AWSConfig) {
    awsConfig.update({
      credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
      region: config.region
    });
  }

  save (work: Work): Promise<any> {
    return this.readDB()
    .then(() => {
      if (this.hasChanged(work)) {
        this.saveToMap(work);
        return this.writeDB();
      }
    });
  }

  private hasChanged(work:Work):boolean {
    let previous = S3StateManager.stateMap[work.id];
    return !previous || JSON.stringify(previous) !== JSON.stringify(work);
  }

  private saveToMap(work: Work) {
    if (!work.id) {
      work.id = S3StateManager.nextID;
      if (!work.id) {
        throw new Error("Expected work to have an id");
      }
      S3StateManager.nextID = S3StateManager.calculateNextID();
    }
    S3StateManager.stateMap[work.id] = work.copy();
  }

  saveAll (work: Work[]): Promise<any> {
    return this.readDB()
    .then(() => {
      let anyChanged = work.reduce((result, row) => {
        return result || this.hasChanged(row);
      }, false);
      if (anyChanged) {
        work.forEach((row) => {
          this.saveToMap(row);
        });  
        return this.writeDB();
      }
    });
  }

  load (id: string): Promise<Work> {
    return this.readDB()
    .then(() => {
      return S3StateManager.stateMap[id];
    });
  }

  loadAll (ids: string[]): Promise<Work[]> {
    return this.readDB()
    .then(() => {
      return ids.map((id) => {
        return S3StateManager.stateMap[id];
      })
      .filter((row) => {
        return !!row;
      });
    });
  }

  childWorkFinished(work: Work, parent: Work): Promise<boolean> {
    parent.finishedChildrenIDs.push(work.id);
    let isDone = parent.finishedChildrenIDs.length === parent.childrenIDs.length;
    return this.save(parent)
    .then(() => {
      return isDone;
    });
  }

  private writeDB(): Promise<any> {
    let s3 = new S3();
    let key = `${this.config.s3StateKeyPrefix}.json`;
    let json = JSON.stringify(S3StateManager.stateMap, null, 2);
    let args = {
      Bucket: this.config.bucket,
      Key: key,
      ContentType : 'application/json',
      Body : new Buffer(json),
      ACL : 'private'
    };

    return new Promise((ok, fail) => {
      this.workhorse.logger.log(`Saving state database to ${key}...`);
      s3.putObject(args, (err, data) => {
        if (err) {
          return fail(err);
        }
        ok();
      });
    });
  }

  private readDB(force?: boolean): Promise<any> {
    if (S3StateManager.stateMap && force !== true) {
      return Promise.resolve(S3StateManager.stateMap);
    }

    let s3 = new S3();
    let key = `${this.config.s3StateKeyPrefix}.json`;
    let args = {
      Bucket: this.config.bucket,
      Key: decodeURIComponent(key.replace(/\+/g, " "))
    };

    return new Promise((ok, fail) => {
      this.workhorse.logger.log(`Loading state database from S3: ${key}...`);
      s3.getObject(args, (err, data) => {
        if (err) {
          if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
            this.workhorse.logger.log('State database not found, starting fresh');
            S3StateManager.stateMap = {};
            S3StateManager.nextID = S3StateManager.calculateNextID();
            return ok(S3StateManager.stateMap);
          }
          return fail(err);
        }
        let raw = data.Body.toString();
        S3StateManager.stateMap = JSON.parse(raw);
        S3StateManager.nextID = S3StateManager.calculateNextID();
        this.workhorse.logger.log('State database loaded');
        ok(S3StateManager.stateMap);
      });
    }); 
  }

  private static translateNumericIDIntoID(id:number):string {
    let now = new Date();
    return (<any>now).format('YYYY-MM-DD-') + id.toString();
  }

  private static calculateNextID() {
    if (S3StateManager.nextNumericID) {
      S3StateManager.nextNumericID++;
      return S3StateManager.translateNumericIDIntoID(S3StateManager.nextNumericID);
    }
    let state = S3StateManager.stateMap;
    if (!state) {
      S3StateManager.nextNumericID = 1;
    }
    else {
      let previousID = S3StateManager.nextNumericID;
      S3StateManager.nextNumericID = Object.keys(state).reduce((result, key) => {
        let parsedKey = key.substring('YYYY-MM-DD-'.length);
        let id = parseInt(parsedKey, 10);
        if (!isNaN(id) && id >= result) {
          return id + 1;
        }
        return result;
      }, 1);
      if (S3StateManager.nextNumericID === previousID) {
        throw new Error("Expected id to be incremented: " + S3StateManager.nextNumericID)
      }
    }
    return S3StateManager.translateNumericIDIntoID(S3StateManager.nextNumericID);
  }
}
