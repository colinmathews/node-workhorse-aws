import { Promise } from 'es6-promise';
import { Route, Work, Router, StateManager, Workhorse } from 'node-workhorse';
import LambdaEvent from '../models/lambda-event';
import LambdaSourceConfigBase from '../models/lambda-source-config/base'
import S3LambdaSourceConfig from '../models/lambda-source-config/s3';
import LambdaSourceBase from './lambda-source/base';
import S3LambdaSource from './lambda-source/s3';

export default class MemoryRouter implements Router {
  workhorse: Workhorse;
  constructor(public config:LambdaSourceConfigBase) {
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
    let source = this.getSource();
    return source.sendWorkToLambda(event);
  }

  handleLambdaRequest(request, context): Promise<any> {
    let source = this.getSource();
    let parsed:LambdaEvent;
    
    return source.parseRequest(request)
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

  private getSource(): LambdaSourceBase {
    if (this.config instanceof S3LambdaSourceConfig) {
      return new S3LambdaSource(this.config);
    }
    throw new Error("Unexpected configuration means we couldn't find a lambda source to use");
  }

  private createLambdaEvent(workID: string, runFinalizer: boolean = false): Promise<LambdaEvent> {
    return Promise.resolve(new LambdaEvent(workID, runFinalizer));
  }
}
