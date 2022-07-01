/**
 * Checks that a string is either undefined, null, empty or only contains whitespaces.
 *
 * @export
 * @param {string | null | undefined} str
 * @return {*}
 */
export function isNullOrWhiteSpaces(str: string | null | undefined) {
  return str === undefined || str === null || str.match(/^ *$/) !== null;
}