import settings from '../../lib/settings';
import Module from '../../lib/module';
import { getConversation, getSnapchatPublicUser, getSnapchatStore } from '../../utils/snapchat';
import { PresenceActionMap, PresenceState } from '../../lib/constants';
import styles from './index.module.css';

const store = getSnapchatStore();

let oldOnActiveConversationInfoUpdated: any = null;
let newOnActiveConversationInfoUpdated: any = null;

function sendNtfyNotification({
  user,
  presenceState,
  conversation,
  conversationId,
}: {
  user: any;
  presenceState: PresenceState;
  conversation: any;
  conversationId?: string;
}) {
  const ntfyEnabled = settings.getSetting('NTFY_ENABLED');
  const ntfyTopic = settings.getSetting('NTFY_TOPIC');

  // logInfo('user', user);
  // logInfo('presence', presenceState);
  // logInfo('conversation', conversation);
  // logInfo('conversationId', conversationId);

  const {
    username,
    bitmoji_avatar_id: bitmojiAvatarId,
    bitmoji_selfie_id: bitmojiSelfieId,
    display_name: displayName,
  } = user;
  const conversationTitle = conversation?.title ?? 'your Chat';

  const navigationPath = `snapchat://feed?conversation_id=${conversationId}`; //`/web/${conversationId}`;
  const action = PresenceActionMap[presenceState](conversationTitle);

  let iconUrl = undefined;
  if (bitmojiSelfieId != null && bitmojiAvatarId != null) {
    iconUrl = `https://sdk.bitmoji.com/render/panel/${bitmojiSelfieId}-${bitmojiAvatarId}-v1.webp?transparent=1&trim=circle&scale=1`;
  } else if (bitmojiAvatarId != null) {
    iconUrl = `https://sdk.bitmoji.com/render/panel/${bitmojiAvatarId}-v1.webp?transparent=1&trim=circle&scale=1`;
  }

  if (ntfyEnabled && ntfyTopic) {
    const requestId = Math.random().toString(36).substring(7);

    window.postMessage(
      {
        type: 'BETTERSNAP_TO_BACKGROUND',
        requestId,
        payload: {
          type: 'SEND_NTFY_NOTIFICATION',
          data: {
            topic: ntfyTopic,
            title: displayName ?? username,
            body: action,
            iconUrl: iconUrl,
            clickUrl: navigationPath,
            priority: 5,
          },
        },
      },
      '*',
    );
  }
}

const userPresenceMap: Map<string, PresenceState> = new Map();
const serializeUserConversationId = (userId: string, conversationId?: string) =>
  `${userId}:${conversationId ?? 'direct'}`;

function addPeekingIndicator(container: Element, conversation_id?: string) {
  const O4POsElement = container.querySelector('.O4POs');
  if (!O4POsElement) {
    return;
  }

  container = O4POsElement;
  if (container.querySelector(`.${styles.peeking}`)) {
    return;
  }

  const peekingDiv = document.createElement('div');
  peekingDiv.id = `peeking-indicator-${conversation_id}`;
  peekingDiv.className = styles.peeking;

  const peekingItem = document.createElement('div');
  peekingItem.id = `peeking-item-${conversation_id}`;
  peekingItem.className = styles.peekingItem;

  peekingDiv.appendChild(peekingItem);
  container.prepend(peekingDiv);

  if (window.getComputedStyle(container).display !== 'flex') {
    (container as HTMLElement).style.display = 'flex';
    (container as HTMLElement).style.flexDirection = 'row';
    (container as HTMLElement).style.alignItems = 'center';
  }
}

function removePeekingIndicator(conversationId: string) {
  const container = getConversationContainerElementFromId(conversationId);
  if (container) {
    container.classList.remove('isPeeking');
    // Wait for animation to complete before removing
    const peekingDiv = document.getElementById(`peeking-indicator-${conversationId}`);
    if (peekingDiv) {
      setTimeout(() => {
        peekingDiv.remove();
      }, 400); // Match the animation duration
    }
  }
}

function getConversationContainerElementFromId(conversationId: string) {
  const element = document.getElementById(`title-${conversationId}`);
  return element?.closest('div[role="listitem"]');
}

function onUserStartedPeeking(user: any, conversationId: string, conversation: any) {
  const container = getConversationContainerElementFromId(conversationId ?? '');
  if (container) {
    addPeekingIndicator(container, conversationId);
    // Use requestAnimationFrame to ensure smooth animation trigger
    requestAnimationFrame(() => {
      container.classList.add('isPeeking');
    });
  }
}

function onUserStoppedPeeking(userId: string, conversationId: string) {
  removePeekingIndicator(conversationId);
}

async function handleOnActiveConversationInfoUpdated(activeConversationInfo: any) {
  const halfSwipeNotificationEnabled = settings.getSetting('HALF_SWIPE_NOTIFICATION');
  const ntfyEnabled = settings.getSetting('NTFY_ENABLED');
  const peekingIndicatorEnabled = settings.getSetting('PEEKING_INDICATOR');
  const ntfyIgnoredNames = settings.getSetting('NTFY_IGNORED_NAMES');
  const enabled = halfSwipeNotificationEnabled || ntfyEnabled;

  const currentlyPeekingUsers = new Set<string>();

  for (const [conversationId, { peekingParticipants }] of activeConversationInfo.entries()) {
    const conversation = getConversation(conversationId)?.conversation;

    for (const userId of peekingParticipants) {
      const user = await getSnapchatPublicUser(userId);

      const serializedId = serializeUserConversationId(userId, conversationId);
      const previousState = userPresenceMap.get(serializedId);

      currentlyPeekingUsers.add(serializedId);

      if (previousState === PresenceState.PEEKING) {
        continue;
      }

      if (enabled) {
        const { username, display_name: displayName } = user;
        const conversationTitle = conversation?.title ?? 'your Chat';
        const ignoredNames = typeof ntfyIgnoredNames === 'string' ? JSON.parse(ntfyIgnoredNames) : [];
        if (
          ignoredNames.includes(displayName) ||
          ignoredNames.includes(username) ||
          ignoredNames.includes(conversationTitle)
        ) {
          return;
        }
        if (peekingIndicatorEnabled) {
          onUserStartedPeeking(user, conversationId, conversation);
        }
        sendNtfyNotification({
          user,
          conversation,
          conversationId,
          presenceState: PresenceState.PEEKING,
        });
      }

      userPresenceMap.set(serializedId, PresenceState.PEEKING);
    }
  }

  // Check user stop peeking
  for (const [serializedId, state] of userPresenceMap.entries()) {
    if (state === PresenceState.PEEKING && !currentlyPeekingUsers.has(serializedId)) {
      const parts = serializedId.split(':');
      if (parts[0] && parts[1]) {
        onUserStoppedPeeking(parts[0], parts[1]);
      }
      userPresenceMap.delete(serializedId);
    }
  }
}

class PeekingIndicator extends Module {
  private isLoading = false;

  constructor() {
    super('Peeking Indicator');
    store.subscribe((storeState: any) => storeState.presence, this.load.bind(this));
    settings.on('HALF_SWIPE_NOTIFICATION.setting:update', () => this.load());
    settings.on('NTFY_ENABLED.setting:update', () => this.load());
  }

  load(presenceClient?: any) {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      presenceClient = presenceClient ?? store.getState().presence;
      if (presenceClient == null) {
        return;
      }

      const halfSwipeNotificationEnabled = settings.getSetting('HALF_SWIPE_NOTIFICATION');
      const ntfyEnabled = settings.getSetting('NTFY_ENABLED');
      const enabled = halfSwipeNotificationEnabled || ntfyEnabled;
      const changedValues: any = {};

      if (enabled && presenceClient.onActiveConversationInfoUpdated !== newOnActiveConversationInfoUpdated) {
        oldOnActiveConversationInfoUpdated = presenceClient.onActiveConversationInfoUpdated;

        newOnActiveConversationInfoUpdated = new Proxy(oldOnActiveConversationInfoUpdated, {
          apply(targetFunc: any, thisArg: any, [activeConversationPayload, ...rest]: any) {
            handleOnActiveConversationInfoUpdated(activeConversationPayload);
            return Reflect.apply(targetFunc, thisArg, [activeConversationPayload, ...rest]);
          },
        });

        changedValues.onActiveConversationInfoUpdated = newOnActiveConversationInfoUpdated;
      }

      if (!enabled && oldOnActiveConversationInfoUpdated != null) {
        changedValues.onActiveConversationInfoUpdated = oldOnActiveConversationInfoUpdated;
        oldOnActiveConversationInfoUpdated = null;
        userPresenceMap.clear();
      }

      if (Object.keys(changedValues).length === 0) {
        return;
      }

      store.setState({ presence: { ...presenceClient, ...changedValues } });
    } finally {
      this.isLoading = false;
    }
  }
}

export default new PeekingIndicator();
