require('date-format-lite'); 
import LambdaSourceBase from './base';
import LambdaEvent from '../../models/lambda-event';
import { createS3, upload, download } from '../../util/aws-util';

export default class S3LambdaSource extends LambdaSourceBase {
  sendWorkToLambda(event: LambdaEvent): Promise<any> {
    let s3 = createS3(this.config);
    let baseKey = this.config.lambdaEventsS3BaseKey.replace(/\/?$/gi, '');
    let now = new Date();
    let folder = (<any>now).format('YYYY-MM-DD');
    let uniqueID = (<any>now).format('hh:mm:ss.SS');
    let key = `${baseKey}/${folder}/${uniqueID}.js`;

    return upload(
      this.config, 
      s3, 
      key, 
      JSON.stringify(event), 
      'application/json');
  }

  parseRequest(request): Promise<LambdaEvent> {
    let s3 = createS3(this.config);
    return download(this.config, s3, request.object.key)
    .then((result) => {
      return JSON.parse(result);
    });
  }
}
