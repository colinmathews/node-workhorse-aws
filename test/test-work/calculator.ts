import { Promise } from 'es6-promise';
import { Runnable, Workhorse, Response, Work } from 'node-workhorse';

export default class Calculator implements Runnable {
  errors: Error[] = [];
  workhorse: Workhorse;

  run (work: Work): Promise<Response> {
    return new Promise((ok, fail) => {
      let input = work.input;
      if (typeof(input.x) !== 'number' || typeof(input.y) !== 'number') {
        return fail(new Error('Inputs must be numbers'));
      }
      let children;
      if (input.twice) {
        this.workhorse.logger.logInsideWork(work, 'Creating child work');
        children = this.createChildWork(input);
      }
      else if (input.recurse > 0) {
        this.workhorse.logger.logInsideWork(work, 'Creating child work');
        children = this.createChildWork(input);
      }
      this.workhorse.logger.logInsideWork(work, 'Performing addition');
      ok({
        result: input.x + input.y,
        childWork: children
      });
    });
  }

  private createChildWork(input: any) {
    let newInput:any = {
      x: input.x,
      y: input.y
    };
    if (input.recurse) {
      newInput.recurse = input.recurse - 1;
    }
    return [new Work('working://dist/test/test-work/calculator', newInput)];
  }

  onChildrenDone (work: Work): Promise<any> {
    return work.deep(this.workhorse)
    .then((deep) => {
      return deep.children.reduce((result, row) => {
        var add = 0;
        if (row.finalizerResult) {
          add += result + (row.finalizerResult.result || 0);
        }
        add += row.result.result;
        return result + add;
      }, 0);
    });
  }
}
