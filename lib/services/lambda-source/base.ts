import LambdaConfig from '../../models/lambda-config';
import LambdaEvent from '../../models/lambda-event';

export default class LambdaSourceBase {
  constructor(public config: LambdaConfig) {
  }

  // TODO: Use abstract methodes/class when possible
  sendWorkToLambda(event: LambdaEvent): Promise<any> {
    throw new Error('Subclasses must implement "sendWorkToLambda"');
  }

  parseRequest(request): Promise<LambdaEvent> {
    throw new Error('Subclasses must implement "parseRequest"'); 
  }
}
