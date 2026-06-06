import { logError, logInfo } from './debug';

/**
 * Executes a named patch callback and logs whether it succeeded or failed.
 *
 * @param name - Identifier used in log messages for the patch
 * @param callback - Function that performs the patch; any thrown error is caught and logged
 */
export function registerPatch(name: string, callback: () => void) {
  try {
    callback();
    logInfo(`Patched: ${name}`);
  } catch (error) {
    logError(`Error loading patch ${name}:`, error);
  }
}