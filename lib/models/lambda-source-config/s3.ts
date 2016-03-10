import LambdaSourceConfigBase from './base';
import AWSConfig from '../aws-config';

export default class S3LambdaSourceConfig extends LambdaSourceConfigBase {
  constructor(public aws:AWSConfig, public baseKey:string) {
    super();
  }
}
