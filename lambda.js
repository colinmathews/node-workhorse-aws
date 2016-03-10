var LambdaRouter = require('./dist/services/lambda-router');
var AWSConfig = require('./dist/models/aws-config');
var S3LambdaSourceConfig from './dist/models/lambda-source-config/s3';
var Workhorse = require('node-workhorse').Workhorse;
var Config = require('node-workhorse').Config;
var S3Logger = require('./dist/services/s3-logger');
var DynamoDBStateManager = require('./dist/services/dynamodb-state-manager');

function getConfig() {
  let jsonPath = path.resolve(__dirname, './aws-config.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
  }

  let rawConfig = JSON.parse(fs.readFileSync(jsonPath));
  let awsConfig = new AWSConfig(rawConfig);
  return {
    raw: rawConfig,
    aws: awsConfig
  };
}

// TODO: Create a factory to read options and generate the appropriate source
exports.handler = function(options, context) {
  var configs = getConfig();
  var s3Config = new S3LambdaSourceConfig(configs.aws, configs.raw.lambdaEventsS3BaseKey);
  var router = new LambdaRouter(s3Config);

  var workhorse = new Workhorse(new Config({
    stateManager: new DynamoDBStateManager(configs.aws),
    logger: new S3Logger(configs.aws),
    router: router
  }));

  router.handleLambdaRequest(options, context);
};