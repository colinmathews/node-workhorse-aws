import { Promise } from 'es6-promise';
import { Work, StateManager, Workhorse} from 'node-workhorse';
import S3Config from '../models/s3-config';
import { S3, config as awsConfig, Config, Credentials } from 'aws-sdk';

const keySuffix = '2016-02-18';

export default class S3StateManager implements StateManager {
  workhorse: Workhorse;
  static stateMap = null;
  static nextID: number;

  constructor(public config: S3Config) {
    awsConfig.update({
      credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
      region: config.region
    });
  }

  save (work: Work): Promise<any> {
    return this.readDB()
    .then(() => {
      return this.saveToMap(work);
    })
    .then(() => {
      return this.writeDB();
    });
  }

  private saveToMap(work: Work) {
    if (!work.id) {
      work.id = (S3StateManager.nextID++).toString();
    }
    S3StateManager.stateMap[work.id] = work;
  }

  saveAll (work: Work[]): Promise<any> {
    return this.readDB()
    .then(() => {
      work.forEach((row) => {
        this.saveToMap(row);
      });
    })
    .then(() => {
      return this.writeDB();
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

  private writeDB(): Promise<any> {
    let s3 = new S3();
    let key = `${this.config.s3StateKeyPrefix}${keySuffix}.json`;
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
    let key = `${this.config.s3StateKeyPrefix}${keySuffix}.json`;
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
            ok(S3StateManager.stateMap);
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

  private static calculateNextID() {
    let nextID = 1;
    let state = S3StateManager.stateMap;
    if (!state) {
      return nextID;
    }
    return Object.keys(state).reduce((result, key) => {
      let id = parseInt(key, 10);
      if (!isNaN(id) && id > result) {
        return id + 1;
      }
      return result;
    }, 1);
  }
}
