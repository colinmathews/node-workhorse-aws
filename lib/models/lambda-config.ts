import AWSConfig from './aws-config';
import LambdaSourceType from './lambda-source-type';

export default class LambdaConfig {
  routingSource: LambdaSourceType;
  s3BaseKey: string;

  constructor(public aws: AWSConfig, props: any = {}) {
    Object.keys(props).forEach((key) => {
      this[key] = props[key];
    });
  }
}
