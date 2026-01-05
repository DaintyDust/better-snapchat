import settings from '../../lib/settings';
import Module from '../../lib/module';
import { getConversation, getSnapchatPublicUser, getSnapchatStore } from '../../utils/snapchat';
import { logInfo } from '../../lib/debug';
import { PresenceActionMap, PresenceState } from '../../lib/constants';

const store = getSnapchatStore();

let oldOnActiveConversationInfoUpdated: any = null;
let newOnActiveConversationInfoUpdated: any = null;

function sendPresenceNotification({
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
  const ntfyIgnoredNames = settings.getSetting('NTFY_IGNORED_NAMES');
  const {
    username,
    bitmoji_avatar_id: bitmojiAvatarId,
    bitmoji_selfie_id: bitmojiSelfieId,
    display_name: displayName,
  } = user;
  const conversationTitle = conversation?.title ?? 'your Chat';
  const navigationPath = `/web/${conversationId}`;
  const action = PresenceActionMap[presenceState](conversationTitle);

  const ignoredNames = typeof ntfyIgnoredNames === 'string' ? JSON.parse(ntfyIgnoredNames) : [];
  if (
    ignoredNames.includes(displayName) ||
    ignoredNames.includes(username) ||
    ignoredNames.includes(conversationTitle)
  ) {
    return;
  }

  let iconUrl = undefined;
  if (bitmojiSelfieId != null && bitmojiAvatarId != null) {
    iconUrl = `https://sdk.bitmoji.com/render/panel/${bitmojiSelfieId}-${bitmojiAvatarId}-v1.webp?transparent=1&trim=circle&scale=1`;
  } else if (bitmojiAvatarId != null) {
    iconUrl = `https://sdk.bitmoji.com/render/panel/${bitmojiAvatarId}-v1.webp?transparent=1&trim=circle&scale=1`;
  }

  const notificationOptions = {
    body: action,
    icon: iconUrl,
    data: { url: navigationPath },
  };

  const notification = new Notification(displayName ?? username, notificationOptions);

  notification.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      window.focus();
      window.history.pushState({}, '', navigationPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
      notification.close();
    },
    { once: true },
  );

  return notification;
}

const userPresenceMap: Map<string, PresenceState> = new Map();
const serializeUserConversationId = (userId: string, conversationId?: string) =>
  `${userId}:${conversationId ?? 'direct'}`;

async function handleOnActiveConversationInfoUpdated(activeConversationInfo: any) {
  const halfSwipeNotificationEnabled = settings.getSetting('HALF_SWIPE_NOTIFICATION');
  const presenceLoggingEnabled = settings.getSetting('PRESENCE_LOGGING');

  const currentlyPeekingUsers = new Set<string>();
  const currentlyTypingOrIdleUsers = new Set<string>();

  for (const [conversationId, { peekingParticipants, typingParticipants }] of activeConversationInfo.entries()) {
    const conversation = getConversation(conversationId)?.conversation;
    const conversationTitle = conversation?.title ?? 'your Chat';

    for (const userId of peekingParticipants) {
      const user = await getSnapchatPublicUser(userId);

      const serializedId = serializeUserConversationId(userId, conversationId);
      const previousState = userPresenceMap.get(serializedId);

      currentlyPeekingUsers.add(serializedId);

      if (previousState === PresenceState.PEEKING) {
        continue;
      }

      if (presenceLoggingEnabled) {
        const action = PresenceActionMap[PresenceState.PEEKING](conversationTitle);
        logInfo(`${user.display_name ?? user.username}:`, action);
      }

      if (halfSwipeNotificationEnabled) {
        sendPresenceNotification({
          user,
          conversation,
          conversationId,
          presenceState: PresenceState.PEEKING,
        });
      }

      userPresenceMap.set(serializedId, PresenceState.PEEKING);
    }

    for (const { userId, typingState } of typingParticipants) {
      const user = await getSnapchatPublicUser(userId);
      const presenceState = typingState === 1 ? PresenceState.TYPING : PresenceState.IDLE;

      const serializedId = serializeUserConversationId(userId, conversationId);
      const previousState = userPresenceMap.get(serializedId);

      currentlyTypingOrIdleUsers.add(serializedId);

      if (previousState === presenceState) {
        continue;
      }

      if (presenceLoggingEnabled) {
        const action = PresenceActionMap[presenceState](conversationTitle);
        logInfo(`${user.display_name ?? user.username}:`, action);
      }

      userPresenceMap.set(serializedId, presenceState);
    }
  }

  // Clear peeking state for users who stopped peeking
  for (const [serializedId, state] of userPresenceMap.entries()) {
    if (state === PresenceState.PEEKING && !currentlyPeekingUsers.has(serializedId)) {
      userPresenceMap.delete(serializedId);
    }
  }

  // Clear typing/idle state for users who stopped typing/idling
  for (const [serializedId, state] of userPresenceMap.entries()) {
    if (
      (state === PresenceState.TYPING || state === PresenceState.IDLE) &&
      !currentlyTypingOrIdleUsers.has(serializedId)
    ) {
      userPresenceMap.delete(serializedId);
    }
  }
}

class PresenceLogging extends Module {
  constructor() {
    super('Presence Logging');
    store.subscribe((storeState: any) => storeState.presence, this.load);
    settings.on('PRESENCE_LOGGING.setting:update', () => this.load());
    settings.on('HALF_SWIPE_NOTIFICATION.setting:update', () => this.load());
  }

  load(presenceClient?: any) {
    presenceClient = presenceClient ?? store.getState().presence;
    if (presenceClient == null) {
      return;
    }

    const halfSwipeNotificationEnabled = settings.getSetting('HALF_SWIPE_NOTIFICATION');
    const presenceLoggingEnabled = settings.getSetting('PRESENCE_LOGGING');
    const enabled = halfSwipeNotificationEnabled || presenceLoggingEnabled;
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
  }
}

export default new PresenceLogging();
