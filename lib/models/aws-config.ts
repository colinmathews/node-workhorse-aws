import LambdaSourceType from './lambda-source-type';

export default class AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  s3StateKeyPrefix: string;
  s3LoggerKeyPrefix: string;
  dynamoDBWorkTable: string;
  lambdaRoutingSource: LambdaSourceType;
  lambdaEventsS3BaseKey: string;
  lambdaEventsAPIGatewayPostUrl: string;
  lambdaEventsAPIGatewayKey: string;

  constructor(props: any = {}) {
    Object.keys(props).forEach((key) => {
      this[key] = props[key];
    });
  }
}
