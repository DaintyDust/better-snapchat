import settings from '@lib/settings';
import Module from '@lib/module';
import { getSnapchatStore } from '@utils/snapchat';

const store = getSnapchatStore();

const setMessageContentType = (prevState: any) => {
  for (const conversation of Object.values(prevState.messaging.conversations) as any[]) {
    const messages = conversation?.messages;
    if (messages instanceof Map) {
      for (const [key, message] of messages.entries()) {
        if (message.messageContent && message.messageContent.contentType === 1) {
          message.messageContent.contentType = 3;
        }
      }
    }
  }

  return prevState;
};

function previewSnap() {
  if (store) {
    store.setState(setMessageContentType);
  }
}

class SnapPeeking extends Module {
  constructor() {
    super('Snap Peeking');
    store.subscribe((storeState: any) => storeState.messaging, this.load.bind(this));
    settings.on('SNAP_PEEKING.setting:update', () => this.load());
  }

  load() {
    const enabled = settings.getSetting('SNAP_PEEKING');
    if (enabled) {
      previewSnap();
    }
  }
}

export default new SnapPeeking();
