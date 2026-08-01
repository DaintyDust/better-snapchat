import settings from '@lib/settings';
import { registerPatch } from '@lib/patch';
import { logError } from '@lib/debug';

const STORY_READ_RECEIPT_REGEX = /\/readreceipt-indexer\/batchuploadreadreceipts/;

registerPatch('Window Fetch', () => {
  const settingsSyncChannel = new BroadcastChannel('bettersnap_settings_sync');

  settings.on('PREVENT_CONVERSATION_READ_RECEIPTS.setting:update', () => {
    settingsSyncChannel.postMessage({
      setting: 'PREVENT_CONVERSATION_READ_RECEIPTS',
      value: settings.getSetting('PREVENT_CONVERSATION_READ_RECEIPTS'),
    });
  });

  settings.on('BITMOJI_PRESENCE.setting:update', () => {
    settingsSyncChannel.postMessage({
      setting: 'BITMOJI_PRESENCE',
      value: settings.getSetting('BITMOJI_PRESENCE'),
    });
  });

  window.fetch = new Proxy(window.fetch, {
    apply(target, thisArg, [request, ...rest]) {
      try {
        const requestUrl = typeof request === 'string' ? request : request?.url;

        if (settings.getSetting('PREVENT_STORY_READ_RECEIPTS') && requestUrl && STORY_READ_RECEIPT_REGEX.test(requestUrl)) {
          return Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
        }
      } catch (e) {
        logError('Fetch patch error:', e);
      }

      return Reflect.apply(target, thisArg, [request, ...rest]);
    },
  });

  const workerInjected = function (initRead: boolean, initBitmoji: string) {
    try {
      if ((self as any).__betterSnapInjected) return;
      (self as any).__betterSnapInjected = true;

      const CONVERSATION_READ_RECEIPT_REGEX = /\/messagingcoreservice\.MessagingCoreService\/UpdateConversation/;

      const logWorkerError = (...args: unknown[]) => {
        console.error(
          `%c ERROR %c %c Better-Snap (Worker) `,
          'background: #e78284; color: black; font-weight: bold; border-radius: 5px;',
          '',
          'background: #3b5bdb; color: white; font-weight: bold; border-radius: 5px;',
          ...args,
        );
      };

      let preventRead = initRead;
      let hideBitmoji = initBitmoji === 'HIDE';
      let blockedReadRequest: Request | null = null;

      const bc = new BroadcastChannel('bettersnap_settings_sync');
      const oldFetch = self.fetch;

      bc.onmessage = (event) => {
        try {
          const { setting, value, action } = event.data || {};

          if (setting === 'PREVENT_CONVERSATION_READ_RECEIPTS') {
            preventRead = value;
          }

          if (setting === 'BITMOJI_PRESENCE') {
            hideBitmoji = value === 'HIDE';
          }

          if (action === 'FORCE_MARK_READ' && blockedReadRequest) {
            try {
              oldFetch(blockedReadRequest.clone()).catch((error) => logWorkerError('Failed force read:', error));
            } catch (e) {
              logWorkerError('Request clone on force read failed:', e);
            }
            blockedReadRequest = null;
          }
        } catch (e) {
          logWorkerError('Settings sync error:', e);
        }
      };

      if (typeof WebSocket !== 'undefined' && WebSocket.prototype) {
        WebSocket.prototype.send = new Proxy(WebSocket.prototype.send, {
          apply(target, thisArg, args) {
            if (hideBitmoji) {
              try {
                const payload = args[0];
                const text = payload instanceof ArrayBuffer || ArrayBuffer.isView(payload) ? new TextDecoder().decode(payload) : String(payload);

                if (text.includes('send-transient-message') && text.includes('presence')) {
                  return;
                }
              } catch {}
            }

            return Reflect.apply(target, thisArg, args);
          },
        });
      }

      self.fetch = async (...args: [RequestInfo | URL, RequestInit?]) => {
        try {
          const req = args[0];
          const url = typeof req === 'string' ? req : req instanceof Request ? req.url : req?.href || '';

          if (preventRead && url && CONVERSATION_READ_RECEIPT_REGEX.test(url)) {
            try {
              if (req instanceof Request) {
                blockedReadRequest = req.clone();
              } else {
                blockedReadRequest = new Request(args[0], args[1]);
              }
            } catch (e) {
              logWorkerError('Request clone error:', e);
            }
            return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
          }
        } catch (e) {
          logWorkerError('Fetch intercept error:', e);
        }

        return oldFetch(...args);
      };
    } catch (e) {
      console.error('[BetterSnap Worker] Injection error:', e);
    }
  };

  const OriginalBlob = window.Blob;
  window.Blob = new Proxy(OriginalBlob, {
    construct(target, args) {
      try {
        const blobParts = args[0];

        if (Array.isArray(blobParts) && typeof blobParts[0] === 'string' && blobParts[0].startsWith('importScripts')) {
          const initRead = settings.getSetting('PREVENT_CONVERSATION_READ_RECEIPTS');
          const initBitmoji = settings.getSetting('BITMOJI_PRESENCE');

          const partsCopy = [...blobParts];
          partsCopy[0] += `\n(${workerInjected.toString()})(${initRead}, '${initBitmoji}');`;
          return Reflect.construct(target, [partsCopy, args[1]]);
        }
      } catch (e) {
        logError('Blob constructor proxy error:', e);
      }

      return Reflect.construct(target, args);
    },
  });
});
