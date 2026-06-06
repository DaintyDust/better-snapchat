import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a tag name composed of a single lowercase letter prefix followed by a UUID v4.
 *
 * @returns A string consisting of one lowercase ASCII letter (`a`–`z`) concatenated with a UUID v4
 */
export function generateTagName(): string {
  const prefix = String.fromCharCode(Math.floor(Math.random() * 26) + 97);
  return `${prefix}${uuidv4()}`;
}
