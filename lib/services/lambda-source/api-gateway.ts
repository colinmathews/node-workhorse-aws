require('date-format-lite');
import LambdaSourceBase from './base';
import LambdaEvent from '../../models/lambda-event';
import { createS3, upload, download } from '../../util/aws-util';
import https = require('https');
import url = require('url');

function handleGatewayResponse(res, ok, fail) {
  let buffers = [];
  let totalLength = 0;
  res.on('data', function(d) {
    buffers.push(d);
    totalLength += d.length;
  });
  res.on('end', function(d) {
    let buffer = Buffer.concat(buffers, totalLength);
    let raw = buffer.toString();

    try {
      let json = JSON.parse(raw);
      if (res.statusCode !== 200) {
        return fail(new Error(`Failed with status ${res.statusCode}: ${json.message}`));
      }
      ok(json);
    }
    catch(err) {
      fail(new Error(`Failed to parse response as json: ${raw}`));
    }
  });
}

function handleTimeout(req, timeoutMillis, fail) {
  req.on('socket', (socket) => {
    socket.setTimeout(timeoutMillis);
    socket.on('timeout', function() {
      fail(new Error('Request timed out'));
      req.abort();
    });
  });
}

export default class APIGatewayLambdaSource extends LambdaSourceBase {
  sendWorkToLambda(event: LambdaEvent): Promise<any> {
    let args = <any>url.parse(`${this.config.lambdaEventsAPIGatewayPostUrl}/work/${event.workID}`);
    args.method = 'POST';
    args.headers = args.headers || {};
    args.headers['x-api-key'] = this.config.lambdaEventsAPIGatewayKey;
    let postData = {
      runFinalizer: event.runFinalizer
    };

    return new Promise((ok, fail) => {
      let req = https.request(args, (res) => {
        handleGatewayResponse(res, ok, fail);
      });
      req.on('error', function(err) {
        fail(err);
      });
      handleTimeout(req, 1000 * 30, fail);
      req.write(JSON.stringify(postData));
      req.end();
    });
  }

  parseRequest(request): Promise<LambdaEvent> {
    return new Promise((ok, fail) => {
      ok(new LambdaEvent(request.workID, request.runFinalizer === true));
    });
  }
}
