let iframeContentWindow: any | null = null;

/**
 * Obtain and cache a hidden iframe's Window object for isolated DOM/console access.
 *
 * On first call this creates a display:none iframe, appends it to document.head (or documentElement)
 * and caches its `contentWindow`. Subsequent calls return the cached Window object without
 * creating additional iframes.
 *
 * @returns The iframe's `contentWindow` (the iframe's Window) or `null` if it cannot be retrieved.
 */
export function getIframeContentWindow() {
  if (iframeContentWindow != null) {
    return iframeContentWindow;
  }

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  (document.head ?? document.documentElement).appendChild(iframe);
  iframeContentWindow = iframe.contentWindow;
  return iframeContentWindow;
}

const LEVEL_COLORS = {
  log: '#a6d189',
  info: '#89b4fa',
  warn: '#e5c890',
  error: '#e78284',
  debug: '#eebebe',
};

/**
 * Logs an informational message to the hidden iframe's console with styled "LOG" and "Better-Snap" labels.
 *
 * @param args - Values to be logged after the styled labels
 */
export function logInfo(...args: unknown[]) {
  const { console } = getIframeContentWindow();
  console.log(
    `%c LOG %c %c Better-Snap `,
    `background: ${LEVEL_COLORS['log']}; color: black; font-weight: bold; border-radius: 5px;`,
    '',
    `background: #3b5bdb; color: white; font-weight: bold; border-radius: 5px;`,
    ...args,
  );
}

/**
 * Logs a styled warning message to the console with a "WARN" label and a "Better-Snap" badge.
 *
 * @param args - Additional values to append after the styled labels in the console output
 */
export function logWarn(...args: unknown[]) {
  const { console } = getIframeContentWindow();
  console.warn(
    `%c WARN %c %c Better-Snap `,
    `background: ${LEVEL_COLORS['warn']}; color: black; font-weight: bold; border-radius: 5px;`,
    '',
    `background: #3b5bdb; color: white; font-weight: bold; border-radius: 5px;`,
    ...args,
  );
}

/**
 * Logs an error-level message to the console with styled "ERROR" and "Better-Snap" labels.
 *
 * @param args - Values to append after the styled labels in the console output
 */
export function logError(...args: unknown[]) {
  const { console } = getIframeContentWindow();
  console.error(
    `%c ERROR %c %c Better-Snap `,
    `background: ${LEVEL_COLORS['error']}; color: black; font-weight: bold; border-radius: 5px;`,
    '',
    `background: #3b5bdb; color: white; font-weight: bold; border-radius: 5px;`,
    ...args,
  );
}
