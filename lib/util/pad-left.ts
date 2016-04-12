export default function(text: string, chars: number, padChar: string = ' '): string {
  'use strict';
  for (let i = 0; i < chars; i++) {
    text = padChar + text;
  }
  return text;
}
