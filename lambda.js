var Index = require('./dist/index');
var LambdaRouter = Index.LambdaRouter;
var AWSConfig = Index.AWSConfig;
var S3LambdaSourceConfig = Index.S3LambdaSourceConfig;
var Workhorse = require('node-workhorse').Workhorse;
var Config = require('node-workhorse').Config;
var S3Logger = Index.S3Logger;
var DynamoDBStateManager = Index.DynamoDBStateManager;
var path = require('path');
var fs = require('fs');

function getConfig() {
  var jsonPath = path.resolve(__dirname, './aws-config.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(jsonPath + " not found. Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
  }

  var rawConfig = JSON.parse(fs.readFileSync(jsonPath));
  var awsConfig = new AWSConfig(rawConfig);
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
