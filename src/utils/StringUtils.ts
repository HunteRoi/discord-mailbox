export function isNullOrWhiteSpaces(str: string) {
  return str === null || str.match(/^ *$/) !== null;
}

