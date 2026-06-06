let iframeContentWindow: any | null = null;

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
