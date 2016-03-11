import { Promise } from 'es6-promise';
import { Route, Work, Router, StateManager, Workhorse } from 'node-workhorse';
import LambdaEvent from '../models/lambda-event';
import LambdaConfig from '../models/lambda-config'
import LambdaSourceType from '../models/lambda-source-type';
import LambdaSourceBase from './lambda-source/base';
import S3LambdaSource from './lambda-source/s3';

export default class LambdaRouter implements Router {
  workhorse: Workhorse;
  constructor(public config:LambdaConfig) {
  }

  route(options: Route): Promise<any> {
    return this.createLambdaEvent(options.workID)
    .then((event) => {
      return this.sendWorkToLambda(event);
    });
  }

  routeFinalizer(options: Route): Promise<any> {
    return this.createLambdaEvent(options.workID, true)
    .then((event) => {
      return this.sendWorkToLambda(event);
    });
  }

  sendWorkToLambda(event:LambdaEvent): Promise<any> {
    let source = this.getSourceForRouting();
    return source.sendWorkToLambda(event);
  }

  handleLambdaRequest(request, context): Promise<any> {
    let [source, input] = this.getSourceFromRequest(request);
    let parsed:LambdaEvent;
    
    return source.parseRequest(input)
    .then((result) => {
      parsed = result;
      return this.workhorse.state.load(parsed.workID)
    })
    .then((work: Work) => {
      if (parsed.runFinalizer) {
        return this.workhorse.runFinalizer(work);
      }
      else {
        return this.workhorse.run(work);
      }
    })
    .then(() => {
      context.succeed();
    })
    .catch((err) => {
      context.fail(err);
    });
  }

  private getSourceForRouting(): LambdaSourceBase {
    switch (this.config.routingSource) {
      case LambdaSourceType.S3:
        return new S3LambdaSource(this.config);
      default:
        throw new Error(`Unexpected routing source: ${this.config.routingSource}`);
    }
  }

  private getSourceFromRequest(request): [LambdaSourceBase, any] {
    if (!request.Records) {
      throw new Error("Expected lambda request to have 'Records'");
    }
    if (request.Records.length !== 1) {
      throw new Error(`Expected lambda request.Records to have exactly one record. Found ${request.Records.length}`);
    }
    let record = request.Records[0];
    if (record.s3) {
      return [new S3LambdaSource(this.config), record.s3];
    }
    throw new Error(`Unexpected request: ${JSON.stringify(record, null, 2)}`);
  }

  private createLambdaEvent(workID: string, runFinalizer: boolean = false): Promise<LambdaEvent> {
    return Promise.resolve(new LambdaEvent(workID, runFinalizer));
  }
}
