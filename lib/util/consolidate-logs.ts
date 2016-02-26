import { Promise } from 'es6-promise';
import { Work, Workhorse } from 'node-workhorse';
import AWSConfig from '../models/aws-config';
import { S3 } from 'aws-sdk';
import { createS3, download, upload, deleteFile } from'./aws-util'
import padLeft from './pad-left';
import flatten from './flatten';

function addPossiblelogKeysForWork(s3KeyPrefix:string, list:any[], work:any) {
  list.push({
    work: work,
    inside: `${s3KeyPrefix}${work.id}.txt`,
    outside: `${s3KeyPrefix}${work.id}-outside.txt`
  });
}

function addToLogKeys(list:any[], deepWork, s3KeyPrefix:string) {
  addPossiblelogKeysForWork(s3KeyPrefix, list, deepWork);
  deepWork.children.forEach((child) => {
    addToLogKeys(list, child, s3KeyPrefix);
  });
}

function downloadLogs(config:AWSConfig, s3:S3, list:any[]): Promise<any[]> {
  let promises = list.reduce((result, row) => {
    let inside, outside;
    let promise = download(config, s3, row.inside)
    .then((result) => {
      inside = result;
      return download(config, s3, row.outside);
    })
    .then((result) => {
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
  return Promise.all(promises);
}

function consolidate(config:AWSConfig, s3:S3, list:any[]): Promise<any> {
  let promises = list.reduce((result, row) => {
    if (!row.work.parentID) {
      let logs = produceLogs(list, row, 0);
      let promise = cleanUpLogs(config, s3, row, logs);
      result.push(promise);
    }
    return result;
  }, []);
  return Promise.all(promises)
  .then(() => {
    return deleteChildrenLogs(config, s3, list);
  })
}

function cleanUpLogs(config:AWSConfig, s3:S3, row, logs) {
  return upload(config, s3, row.inside, logs.join('\n'))
  .then(() => {
    if (row.outsideExists) {
      return deleteFile(config, s3, row.outside);
    }
  });
}

function deleteLogs(config:AWSConfig, s3:S3, row) {
  if (row.insideExists) {
    return deleteFile(config, s3, row.inside)
    .then(() => {
      if (row.outsideExists) {
        return deleteFile(config, s3, row.outside);
      }
    });
  }
  else if (row.outsideExists) {
    return deleteFile(config, s3, row.outside);
  }
  else {
    return Promise.resolve();
  }
}

function deleteChildrenLogs(config:AWSConfig, s3:S3, list:any[]) {
  let promises = list.reduce((result, row) => {
    if (row.work.parentID) {
      let promise = deleteLogs(config, s3, row);
      result.push(promise);
    }
    return result;
  }, []);
  return Promise.all(promises);
}

function findWorkLogs(list:any[], work:any) {
  let found = list.filter((row) => {
    return row.work.id === work.id;
  });
  return found.length === 0 ? null : found[0];
}

function sortLogs(text:string): string[] {
  let lines = text.split('\n');
  lines.sort();
  return lines.filter((row) => {
    return !!row;
  });
}

export function produceLogs(list:any[], row:any, indent:number = 0, spacesPerIndent:number = 5):string[] {
  let logs = sortLogs(row.contents);
  let pad = (text, indentation) => {
    return padLeft(text, spacesPerIndent * indentation);
  };
  logs = logs.map((logRow) => {
    return pad(logRow, indent);
  })
  let childLogs = row.work.children.map((child) => {
    let childRow = findWorkLogs(list, child);
    let produced = produceLogs(list, childRow, indent + 1, spacesPerIndent);
    if (produced.length > 0) {
      produced = [pad(`--- START WORK ${child.id} ---`, indent + 1)]
        .concat(produced)
        .concat([pad(`--- END WORK ${child.id} ---`, indent + 1)]);
    }
    return produced;
  });
  return logs.concat(flatten(childLogs));
};

export default function(config: AWSConfig, workhorse:Workhorse, work:Work, s3KeyPrefix:string): Promise<any> {
  let list:any[] = [];
  let s3 = createS3(config);
  return work.prettyPrint(workhorse)
  .then((deepWork) => {
    addToLogKeys(list, deepWork, s3KeyPrefix);
    return downloadLogs(config, s3, list)
  })
  .then((rows) => {
    return consolidate(config, s3, rows);
  });
}
