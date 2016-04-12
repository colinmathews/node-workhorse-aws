import { Promise } from 'es6-promise';
import { Route, Work, IRouter, Workhorse } from 'node-workhorse';
import LambdaEvent from '../models/lambda-event';
import AWSConfig from '../models/aws-config';
import LambdaSourceType from '../models/lambda-source-type';
import LambdaSourceBase from './lambda-source/base';
import S3LambdaSource from './lambda-source/s3';
import APIGatewayLambdaSource from './lambda-source/api-gateway';

export default class LambdaRouter implements IRouter {
  workhorse: Workhorse;
  constructor(public config: AWSConfig) {
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

  sendWorkToLambda(event: LambdaEvent): Promise<any> {
    let source = this.getSourceForRouting();
    return source.sendWorkToLambda(event);
  }

  handleLambdaRequest(request: any, context: any): Promise<any> {
    let [source, input] = this.getSourceFromRequest(request);
    let parsed: LambdaEvent;

    return source.parseRequest(input)
    .then((result) => {
      parsed = result;
      return this.workhorse.state.load(parsed.workID);
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
    switch (this.config.lambdaRoutingSource) {
      case LambdaSourceType.S3:
        return new S3LambdaSource(this.config);
      case LambdaSourceType.APIGateway:
        return new APIGatewayLambdaSource(this.config);
      default:
        throw new Error(`Unexpected routing source: ${this.config.lambdaRoutingSource}`);
    }
  }

  private getSourceFromRequest(request: any): [LambdaSourceBase, any] {
    if (request.Records) {
      if (request.Records.length !== 1) {
        throw new Error(`Expected lambda request.Records to have exactly one record. Found ${request.Records.length}`);
      }
      let record = request.Records[0];
      if (record.s3) {
        return [new S3LambdaSource(this.config), record.s3];
      }
      throw new Error(`Unexpected request: ${JSON.stringify(record, null, 2)}`);
    }

    return [new APIGatewayLambdaSource(this.config), request];
  }

  private createLambdaEvent(workID: string, runFinalizer: boolean = false): Promise<LambdaEvent> {
    return Promise.resolve(new LambdaEvent(workID, runFinalizer));
  }
}
