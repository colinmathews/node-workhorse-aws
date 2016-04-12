function flatten (list: any[]): any[] {
  'use strict';
  return list.reduce(
    (result, row) => {
      if (row instanceof Array) {
        let step1 = result.concat(row);
        return flatten(step1);
      }
      result.push(row);
      return result;
    },
    []
  );
}

export default flatten;
