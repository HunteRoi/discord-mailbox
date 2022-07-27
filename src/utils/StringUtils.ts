/**
 * Checks that a string is either undefined, null, empty or only contains whitespaces.
 *
 * @export
 * @param {string | null | undefined} str
 * @return {boolean}
 */
export function isNullOrWhiteSpaces(str: string | null | undefined): boolean {
  return str === undefined || str === null || str.match(/^ *$/) !== null;
}
