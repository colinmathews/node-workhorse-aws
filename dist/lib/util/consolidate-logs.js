"use strict";
var es6_promise_1 = require('es6-promise');
var aws_util_1 = require('./aws-util');
var pad_left_1 = require('./pad-left');
var flatten_1 = require('./flatten');
var log_file_naming_1 = require('./log-file-naming');
function addPossiblelogKeysForWork(s3KeyPrefix, list, work) {
    list.push({
        work: work,
        inside: log_file_naming_1.default(s3KeyPrefix, work.id) + '.txt',
        outside: log_file_naming_1.default(s3KeyPrefix, work.id) + '-outside.txt',
    });
}
function addToLogKeys(list, deepWork, s3KeyPrefix) {
    addPossiblelogKeysForWork(s3KeyPrefix, list, deepWork);
    deepWork.children.forEach(function (child) {
        addToLogKeys(list, child, s3KeyPrefix);
    });
}
function downloadLogs(config, s3, list) {
    var promises = list.reduce(function (result, row) {
        var inside, outside;
        var promise = aws_util_1.download(config, s3, row.inside)
            .then(function (result) {
            inside = result;
            return aws_util_1.download(config, s3, row.outside);
        })
            .then(function (result) {
            outside = result;
            return {
                work: row.work,
                contents: (inside || '') + (outside || ''),
                inside: row.inside,
                outside: row.outside,
                insideExists: row.inside !== null,
                outsideExists: row.outside !== null
            };
        });
        result.push(promise);
        return result;
    }, []);
    return es6_promise_1.Promise.all(promises);
}
function consolidate(config, s3, list) {
    var promises = list.reduce(function (result, row) {
        if (!row.work.parentID) {
            var logs = produceLogs(list, row, 0);
            var promise = cleanUpLogs(config, s3, row, logs);
            result.push(promise);
        }
        return result;
    }, []);
    return es6_promise_1.Promise.all(promises)
        .then(function () {
        return deleteChildrenLogs(config, s3, list);
    });
}
function cleanUpLogs(config, s3, row, logs) {
    return aws_util_1.upload(config, s3, row.inside, logs.join('\n'))
        .then(function () {
        if (row.outsideExists) {
            return aws_util_1.deleteFile(config, s3, row.outside);
        }
    });
}
function deleteLogs(config, s3, row) {
    if (row.insideExists) {
        return aws_util_1.deleteFile(config, s3, row.inside)
            .then(function () {
            if (row.outsideExists) {
                return aws_util_1.deleteFile(config, s3, row.outside);
            }
        });
    }
    else if (row.outsideExists) {
        return aws_util_1.deleteFile(config, s3, row.outside);
    }
    else {
        return es6_promise_1.Promise.resolve();
    }
}
function deleteChildrenLogs(config, s3, list) {
    var promises = list.reduce(function (result, row) {
        if (row.work.parentID) {
            var promise = deleteLogs(config, s3, row);
            result.push(promise);
        }
        return result;
    }, []);
    return es6_promise_1.Promise.all(promises);
}
function findWorkLogs(list, work) {
    var found = list.filter(function (row) {
        return row.work.id === work.id;
    });
    return found.length === 0 ? null : found[0];
}
function sortLogs(text) {
    var lines = text.split('\n');
    lines.sort();
    return lines.filter(function (row) {
        return !!row;
    });
}
function produceLogs(list, row, indent, spacesPerIndent) {
    if (indent === void 0) { indent = 0; }
    if (spacesPerIndent === void 0) { spacesPerIndent = 5; }
    var logs = sortLogs(row.contents);
    var pad = function (text, indentation) {
        return pad_left_1.default(text, spacesPerIndent * indentation);
    };
    logs = logs.map(function (logRow) {
        return pad(logRow, indent);
    });
    var childLogs = row.work.children.map(function (child) {
        var childRow = findWorkLogs(list, child);
        var produced = produceLogs(list, childRow, indent + 1, spacesPerIndent);
        if (produced.length > 0) {
            produced = [pad("--- START WORK " + child.id + " ---", indent + 1)]
                .concat(produced)
                .concat([pad("--- END WORK " + child.id + " ---", indent + 1)]);
        }
        return produced;
    });
    return logs.concat(flatten_1.default(childLogs));
}
exports.produceLogs = produceLogs;
;
function default_1(config, workhorse, work, s3KeyPrefix) {
    var list = [];
    var s3 = aws_util_1.createS3(config);
    return work.deep(workhorse)
        .then(function (deepWork) {
        addToLogKeys(list, deepWork, s3KeyPrefix);
        return downloadLogs(config, s3, list);
    })
        .then(function (rows) {
        return consolidate(config, s3, rows);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
//# sourceMappingURL=consolidate-logs.js.map