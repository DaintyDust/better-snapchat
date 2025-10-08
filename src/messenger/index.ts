window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data && event.data.type === 'BETTERSNAP_TO_BACKGROUND') {
    const { payload } = event.data;

    chrome.runtime.sendMessage(payload);
  }
});
