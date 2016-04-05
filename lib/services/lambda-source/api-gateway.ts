require('date-format-lite');
import LambdaSourceBase from './base';
import LambdaEvent from '../../models/lambda-event';
import { createS3, upload, download } from '../../util/aws-util';

export default class APIGatewayLambdaSource extends LambdaSourceBase {
  sendWorkToLambda(event: LambdaEvent): Promise<any> {
    throw new Error('todo: Not implemented yet')
  }

  parseRequest(request): Promise<LambdaEvent> {
    let json = JSON.stringify(request, null, 2);
    console.log(json);
    throw new Error('todo: ' + json);
  }
}
