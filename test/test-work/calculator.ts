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
      this.workhorse.logger.logInsideWork(work, 'Performing addition');
      ok({
        result: input.x + input.y,
        childWork: children
      });
    });
  }

  private createChildWork(input: any) {
    return [new Work('working://dist/test/test-work/calculator', {
      x: input.x,
      y: input.y
    })];
  }

  onChildrenDone (work: Work): Promise<any> {
    return Promise.resolve();
  }
}
