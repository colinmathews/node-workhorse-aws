"use strict";
var es6_promise_1 = require('es6-promise');
var aws_sdk_1 = require('aws-sdk');
function createS3(config) {
    'use strict';
    return new aws_sdk_1.S3({
        credentials: new aws_sdk_1.Credentials(config.accessKeyId, config.secretAccessKey),
        region: config.region,
        bucket: config.bucket
    });
}
exports.createS3 = createS3;
function download(config, s3, key) {
    'use strict';
    return new es6_promise_1.Promise(function (ok, fail) {
        var args = {
            Bucket: config.bucket,
            Key: decodeURIComponent(key.replace(/\+/g, ' '))
        };
        s3.getObject(args, function (err, data) {
            if (err) {
                if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
                    return ok(null);
                }
                return fail(err);
            }
            var raw = data.Body.toString();
            ok(raw);
        });
    });
}
exports.download = download;
function upload(config, s3, key, data, contentType, acl) {
    'use strict';
    if (contentType === void 0) { contentType = 'text/plain'; }
    if (acl === void 0) { acl = 'private'; }
    return new es6_promise_1.Promise(function (ok, fail) {
        var args = {
            Bucket: config.bucket,
            Key: key,
            ContentType: contentType,
            Body: new Buffer(data),
            ACL: acl
        };
        s3.putObject(args, function (err, result) {
            if (err) {
                return fail(err);
            }
            ok();
        });
    });
}
exports.upload = upload;
function deleteFile(config, s3, key) {
    'use strict';
    return new es6_promise_1.Promise(function (ok, fail) {
        var args = {
            Bucket: config.bucket,
            Key: key
        };
        s3.deleteObject(args, function (err, data) {
            if (err) {
                return fail(err);
            }
            ok();
        });
    });
}
exports.deleteFile = deleteFile;
//# sourceMappingURL=aws-util.js.map