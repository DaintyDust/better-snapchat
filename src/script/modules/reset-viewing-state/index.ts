import settings from '@lib/settings';
import Module from '@lib/module';
import { getSnapchatStore } from '@utils/snapchat';

const store = getSnapchatStore();

let originalPushState: typeof history.pushState | null = null;
let isPushStatePatched = false;

function patchHistoryPushState() {
  if (isPushStatePatched) return;
  isPushStatePatched = true;

  originalPushState = history.pushState;
  history.pushState = function (...args) {
    if (originalPushState) {
      originalPushState.apply(this, args);
    }
    window.dispatchEvent(new Event('urlChanged'));
  };
}

class ResetViewingState extends Module {
  urlListener?: () => void;
  isHooked = false;
  private channel?: BroadcastChannel;

  constructor() {
    super('Reset Viewing State');
    settings.on('PREVENT_CONVERSATION_READ_RECEIPTS.setting:update', () => this.load());
  }

  load() {
    const enabled = settings.getSetting('PREVENT_CONVERSATION_READ_RECEIPTS');
    if (!enabled) {
      this.unload();
      return;
    }

    if (this.isHooked) return;
    this.isHooked = true;

    patchHistoryPushState();

    this.urlListener = () => this.handleUrlChange();
    window.addEventListener('urlChanged', this.urlListener);

    if (!this.channel) {
      this.channel = new BroadcastChannel('bettersnap_settings_sync');
      this.channel.onmessage = (event) => {
        if (event.data?.action === 'FORCE_MARK_READ') {
          setConversationViewed();
        }
      };
    }
  }

  handleUrlChange() {
    if (!store) return;

    const match = location.pathname.match(/\/web\/([a-f0-9-]+)/);
    if (!match) return;

    const chatId = match[1];
    if (!chatId) return;

    const currentState = store.getState();
    const currentFeedItem = currentState.messaging?.feed?.[chatId];

    if (!currentFeedItem?.displayInfo) return;
    if (currentFeedItem.displayInfo.viewed === true) return;

    const savedDisplayInfo = JSON.parse(JSON.stringify(currentFeedItem.displayInfo));
    setTimeout(() => {
      store.setState((prevState: any) => {
        const targetFeedItem = prevState.messaging?.feed?.[chatId];
        if (!targetFeedItem) return prevState;
        return {
          ...prevState,
          messaging: {
            ...prevState.messaging,
            feed: {
              ...prevState.messaging.feed,
              [chatId]: {
                ...targetFeedItem,
                displayInfo: savedDisplayInfo,
              },
            },
          },
        };
      });
    }, 500);
  }

  unload() {
    if (this.urlListener) {
      window.removeEventListener('urlChanged', this.urlListener);
      this.urlListener = undefined;
    }
    if (this.channel) {
      this.channel.close();
      this.channel = undefined;
    }
    this.isHooked = false;
  }
}

export default new ResetViewingState();

export function setConversationViewed(chatId?: string) {
  if (!store) return;

  const targetId = chatId || location.pathname.match(/\/web\/([a-f0-9-]+)/)?.[1];
  if (!targetId) return;

  store.setState((prevState: any) => {
    const targetFeedItem = prevState.messaging?.feed?.[targetId];
    if (!targetFeedItem?.displayInfo) return prevState;

    return {
      ...prevState,
      messaging: {
        ...prevState.messaging,
        feed: {
          ...prevState.messaging.feed,
          [targetId]: {
            ...targetFeedItem,
            displayInfo: {
              ...targetFeedItem.displayInfo,
              viewed: true,
            },
          },
        },
      },
    };
  });
}

// const resetUserList = () => {
//       const TARGET_CONV_ID = '557e9d31-de17-5090-a238-a8722e5aa0ca';
//       const setSingleFeedItemUnviewed = (prevState: any) => {
//         const feedItem = prevState.messaging?.feed?.[TARGET_CONV_ID];

//         if (feedItem?.displayInfo && (feedItem as any).displayInfo.viewed === true) {
//           (feedItem as any).displayInfo.viewed = false;
//         }

//         return prevState;
//       };

//       if (store) {
//         store.setState(setSingleFeedItemUnviewed);
//         logDebug('Updated messaging.feed state locally!');
//       }
//     };

//  const resetUserList = () => {
//       const setFeedItemsUnviewed = (prevState: any) => {
//         const feed = prevState.messaging?.feed;
//         if (!feed) return prevState;

//         for (const [convId, feedItem] of Object.entries(feed)) {
//           if (feedItem && (feedItem as any).displayInfo) {
//             (feedItem as any).displayInfo.viewed = false;
//           }
//         }

//         return prevState;
//       };

//       if (store) {
//         store.setState(setFeedItemsUnviewed);
//         logDebug('Updated messaging.feed state locally!');
//       }
//     };
