/**
 * Checks that a string is either undefined, null, empty or only contains whitespaces.
 *
 * @export
 * @param {string} str
 * @return {*}
 */
export function isNullOrWhiteSpaces(str: string) {
  return str === undefined || str === null || str.match(/^ *$/) !== null;
}
