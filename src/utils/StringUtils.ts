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

/**
 * Truncates the provided string and appends three dots at the end.
 *
 * @export
 * @param {string} str
 * @param {number} maxSize
 * @return {string} truncated {str}
 */
export function truncate(str: string, maxSize: number): string {
  return str.length <= maxSize ? str : str.slice(0, maxSize - 3) + '...';
}
