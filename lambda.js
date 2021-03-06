var Index = require('./dist/index');
var LambdaRouter = Index.LambdaRouter;
var AWSConfig = Index.AWSConfig;
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
  return new AWSConfig(rawConfig);
}

exports.handler = function(options, context) {
  var config = getConfig();
  var router = new LambdaRouter(config);

  var workhorse = new Workhorse(new Config({
    stateManager: new DynamoDBStateManager(config),
    logger: new S3Logger(config),
    router: router
  }));

  router.handleLambdaRequest(options, context);
};
