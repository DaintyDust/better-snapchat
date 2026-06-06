import settings from '@lib/settings';
import { registerPatch } from '@lib/patch';

const STORY_READ_RECEIPT_REGEX = /\/readreceipt-indexer\/batchuploadreadreceipts/;

registerPatch('Window Fetch', () => {
  window.fetch = new Proxy(window.fetch, {
    apply(target, thisArg, [request, ...rest]) {
      if (settings.getSetting('PREVENT_STORY_READ_RECEIPTS') && STORY_READ_RECEIPT_REGEX.test(request.url)) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }

      return Reflect.apply(target, thisArg, [request, ...rest]);
    },
  });
});
