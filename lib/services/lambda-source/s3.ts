require('date-format-lite'); 
import LambdaSourceBase from './base';
import S3LambdaSourceConfig from '../../models/lambda-source-config/s3';
import LambdaEvent from '../../models/lambda-event';
import { createS3, upload, download } from '../../util/aws-util';

export default class S3LambdaSource extends LambdaSourceBase {
  sendWorkToLambda(event: LambdaEvent): Promise<any> {
    let myConfig = <S3LambdaSourceConfig>this.config;
    let s3 = createS3(myConfig.aws);
    let baseKey = myConfig.baseKey.replace(/\/?$/gi, '');
    let now = new Date();
    let folder = (<any>now).format('YYYY-MM-DD');
    let uniqueID = (<any>now).format('hh:mm:ss.SS');
    let key = `${baseKey}/${folder}/${uniqueID}.js`;

    return upload(
      myConfig.aws, 
      s3, 
      key, 
      JSON.stringify(event), 
      'application/json');
  }

  parseRequest(request): Promise<LambdaEvent> {
    let myConfig = <S3LambdaSourceConfig>this.config;

    return Promise.resolve(this.normalizeRequest(request))
    .then((record) => {
      let s3 = createS3(myConfig.aws);
      return download(myConfig.aws, s3, record.object.key);
    })
    .then((result) => {
      return JSON.parse(result);
    });
  }

  private normalizeRequest(request) {
    if (!request.Records) {
      throw new Error("Expected lambda request to have 'Records'");
    }
    if (request.Records.length !== 1) {
      throw new Error(`Expected lambda request.Records to have exactly one record. Found ${request.Records.length}`);
    }
    let record = request.Records[0];
    if (!record.s3) {
      throw new Error(`Expected lambda request.Records[0] to have an "s3" property`);
    }
    return record.s3;
  }
}
