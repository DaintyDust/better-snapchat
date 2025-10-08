// Hot Module Replacement (HMR) service worker for development.
import ReconnectingWebsocket from 'reconnecting-websocket';

const PORT = process.env.HMR_PORT ?? 9292;

// Handle ntfy notifications
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEND_NTFY_NOTIFICATION') {
    const { topic, title, body, iconUrl, clickUrl, priority } = request.data;
    
    // Encode header values to handle special characters
    const encodeHeaderValue = (value: string) => {
      // Use base64 encoding for non-ASCII characters
      if (/[^\x00-\x7F]/.test(value)) {
        return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
      }
      return value;
    };
    
    const headers: Record<string, string> = {
      'Priority': priority?.toString() || '3',
    };
    
    if (title) {
      headers['Title'] = encodeHeaderValue(title);
    }
    
    if (iconUrl) {
      headers['Icon'] = iconUrl;
    }
    
    if (clickUrl) {
      headers['Click'] = clickUrl;
    }
    
    fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: body,
      headers: headers,
    })
    .then(response => {
      console.log('ntfy notification sent successfully');
      sendResponse({ success: true, status: response.status });
    })
    .catch(error => {
      console.error('Failed to send ntfy notification:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true;
  }
});

(() => {
  chrome.webNavigation.onCommitted.addListener(({ url, frameId, tabId }) => {
    const { hostname, pathname } = new URL(url);
    if (!['web.snapchat.com', 'www.snapchat.com'].includes(hostname)) {
      return;
    }

    if (hostname === 'www.snapchat.com' && !pathname.startsWith('/web')) {
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: 'MAIN',
      files: ['build/script.js'],
      injectImmediately: true,
    });

    chrome.scripting.insertCSS({
      target: { tabId, frameIds: [frameId] },
      files: ['build/script.css'],
    });
  });

  async function reloadTabs() {
    const tabs = await Promise.all([
      chrome.tabs.query({ url: 'https://web.snapchat.com/*' }),
      chrome.tabs.query({ url: 'https://www.snapchat.com/web/*' }),
    ]);

    for (const { id: tabId } of tabs.flat()) {
      if (tabId == null) {
        continue;
      }

      chrome.tabs.reload(tabId);
    }
  }

  const socket = new ReconnectingWebsocket(`ws://localhost:${PORT}`, [], {
    startClosed: true,
    WebSocket: WebSocket,
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1000 + Math.random() * 4000,
  });

  socket.addEventListener('message', (event) => {
    const { type } = JSON.parse(event.data);
    if (type !== 'reload') {
      return;
    }

    console.log('HMR Server reloading tabs');
    reloadTabs();
  });

  socket.addEventListener('open', () => {
    console.log('HMR Server connected');
    reloadTabs();
  });

  chrome.runtime.onInstalled.addListener(() => socket.reconnect());
  chrome.runtime.onStartup.addListener(() => socket.reconnect());
  chrome.runtime.onSuspend.addListener(() => socket.close());
  chrome.runtime.onSuspendCanceled.addListener(() => socket.reconnect());

  // keep-alive
  setInterval(chrome.runtime.getPlatformInfo, 20e3);
  console.log('HMR Server running on port:', PORT);
})();
