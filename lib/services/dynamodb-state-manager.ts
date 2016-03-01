import { Promise } from 'es6-promise';
import { Work, WorkResult, StateManager, Workhorse} from 'node-workhorse';
import AWSConfig from '../models/aws-config';
import { DynamoDB, config as awsConfig, Credentials } from 'aws-sdk';
let uuid = require('node-uuid');
import flatten from '../util/flatten';

const MAX_BATCH_GET = 25;

export function serializeAsItem(data): any {
  if (data === null) {
    return { NULL: true };
  }
  if (typeof(data) === 'string') {
    return { S: data };
  }
  if (typeof(data) === 'boolean') {
    return { BOOL: data === true };
  }
  if (typeof(data) === 'number') {
    return { N: data.toString() };
  }
  if (data instanceof Array) {
     return { L: data.map((row) => {
       serializeAsItem(row);
     })};
  }
  if (typeof(data) === 'function') {
    return;
  }
  if (typeof(data) === 'undefined') {
    return;
  }
  if (typeof(data) !== 'object') {
    throw new Error("Unexpected type: " + typeof(data));
  }

  let result = {};
  Object.keys(data).forEach((key) => {
    let value = data[key];
    let itemValue = serializeAsItem(value);
    result[key] = itemValue;
  });
  return { M: result };
}

export function deserialize(data):any {
  if (data.S) {
    return data.S;
  }
  if (data.NULL) {
    return null;
  }
  if (data.N) {
    if (data.N.indexOf('.')) {
      return parseFloat(data.N);
    }
    return parseInt(data.N, 10);
  }
  if (data.BOOL) {
    return data.BOOL === true;
  }
  if (data.L) {
    return data.L.map((row) => {
      return deserialize(row);
    })
  }
  if (data.M) {
    let result = {};
    Object.keys(data.M).forEach((key) => {
      let value = data.M[key];
      let itemValue = deserialize(value);
      result[key] = itemValue;
    });
    return result;
  }
  throw new Error("Unexpected data to deserialize: " + JSON.stringify(data, null, 2));
}

export default class DynamoDBStateManager implements StateManager {
  workhorse:Workhorse;
  db:any;

  constructor(public config:AWSConfig) {
    awsConfig.update({
      credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
      region: config.region
    });
    this.db = <any>new DynamoDB();
  }

  save(work:Work): Promise<any> {
    return new Promise((ok, fail) => {
      if (!work.id) {
        work.id = uuid.v4();
      }
      let request = {
        TableName: this.config.dynamoDBWorkTable,
        Item: this.serializeWork(work)
      };
      this.db.putItem(request, (err, data) => {
        if (err) {
          return fail(err);
        }
        ok();
      });
    });
  }

  saveAll(work:Work[]): Promise<any> {
    let promises = work.map((row) => {
      return this.save(row);
    })
    return Promise.all(promises);
  }

  load(id: string): Promise<Work> {
    return new Promise((ok, fail) => {
      let request = {
        TableName: this.config.dynamoDBWorkTable,
        Key: {
          id: {
            S: id
          }
        }
      }
      this.db.getItem(request, (err, data) => {
        if (err) {
          return fail(err);
        }
        if (!data.Item) {
          return ok(null);
        }
        ok(this.deserializeWork(data.Item));
      });
    });
  }

  loadAll(ids:string[]): Promise<Work[]> {
    let requests = [];
    for (let i = 0; i < ids.length; i += MAX_BATCH_GET) {
      requests.push(ids.slice(i, MAX_BATCH_GET));
    }
    let promises = requests.map((row) => {
      return this.batchGet(row);
    });
    return Promise.all(promises)
    .then((result:Work[][]) => {
      return flatten(result);
    });
  }


  private serializeWork(work:Work) {
    return serializeAsItem({
      id: work.id,
      workLoadHref: work.workLoadHref,
      input: work.input,
      result: work.result,
      finalizerResult: work.finalizerResult,
      parentID: work.parentID,
      childrenIDs: work.childrenIDs,
      finishedChildrenIDs: work.finishedChildrenIDs
    }).M;
  }

  private deserializeWork(data): Work {
    let work = new Work();
    let raw = deserialize({ M : data });
    Object.keys(raw).forEach((key) => {
      work[key] = raw[key];
    })
    return work;
  }

  private batchGet(ids:string[]): Promise<Work[]> {
    return new Promise((ok, fail) => {
      let keys = ids.map((row) => {
        return {
          HashKeyElement: {
            S: row
          }
        };
      });
      let request = { RequestItems: {} };
      request.RequestItems[this.config.dynamoDBWorkTable] = {
        Keys: keys
      };
      console.log('todo: batch get = ' + JSON.stringify(request, null, 2));
      this.db.batchGetItem(request, (err, data) => {
        if (err) {
          return fail(err);
        }
        console.log('todo: batch get result = ' + JSON.stringify(data, null, 2));
        let tableData = data.Responses[this.config.dynamoDBWorkTable];
        let works = tableData.Items.map((row) => {
          return this.deserializeWork(row);
        })
        ok(works);
      });
    });
  }
}