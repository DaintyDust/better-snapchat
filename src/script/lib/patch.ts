import { logError, logInfo } from './debug';

export function registerPatch(name: string, callback: () => void) {
  try {
    callback();
    logInfo(`Patched: ${name}`);
  } catch (error) {
    logError(`Error loading patch ${name}:`, error);
  }
}
