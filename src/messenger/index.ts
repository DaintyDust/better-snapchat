window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data && event.data.type === 'BETTERSNAP_TO_BACKGROUND') {
    const runtime = (globalThis as any).chrome?.runtime;
    const { payload } = event.data;

    if (!runtime?.sendMessage || typeof payload !== 'object') {
      return;
    }

    runtime.sendMessage(payload);
  }
});
