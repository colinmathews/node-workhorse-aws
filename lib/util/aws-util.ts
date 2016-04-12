import { Promise } from 'es6-promise';
import AWSConfig from '../models/aws-config';
import { S3, Credentials } from 'aws-sdk';

export function createS3(config: AWSConfig): S3 {
  'use strict';
  return new S3({
    credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
    region: config.region,
    bucket: config.bucket
  });
}

export function download(config: AWSConfig, s3: S3, key: string): Promise<string> {
  'use strict';
  return new Promise((ok, fail) => {
    let args = {
      Bucket: config.bucket,
      Key: decodeURIComponent(key.replace(/\+/g, ' '))
    };
    s3.getObject(args, (err, data) => {
      if (err) {
        if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
          return ok(null);
        }
        return fail(err);
      }
      let raw = data.Body.toString();
      ok(raw);
    });
  });
}

export function upload(
  config: AWSConfig,
  s3: S3,
  key: string,
  data: string,
  contentType: string = 'text/plain',
  acl: string = 'private'): Promise<any> {
  'use strict';
  return new Promise((ok, fail) => {
    let args = {
      Bucket: config.bucket,
      Key: key,
      ContentType : contentType,
      Body : new Buffer(data),
      ACL : acl
    };
    s3.putObject(args, (err, result) => {
      if (err) {
        return fail(err);
      }
      ok();
    });
  });
}

export function deleteFile(config: AWSConfig, s3: S3, key: string): Promise<any> {
  'use strict';
  return new Promise((ok, fail) => {
    let args = {
      Bucket: config.bucket,
      Key: key
    };
    (s3 as any).deleteObject(args, (err, data) => {
      if (err) {
        return fail(err);
      }
      ok();
    });
  });
}
