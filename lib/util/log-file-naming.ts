export default function logFilePathBase(workKeyPrefix: string, workID: string): string {
  'use strict';
  let first = workID.substring(0, 7);
  return `${workKeyPrefix}${first}/${workID}`;
}
