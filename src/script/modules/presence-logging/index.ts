import settings from '../../lib/settings';
import Module from '../../lib/module';
import { getConversation, getSnapchatPublicUser, getSnapchatStore } from '../../utils/snapchat';
import { logInfo } from '../../lib/debug';
import { PresenceActionMap, PresenceState } from '../../lib/constants';

const store = getSnapchatStore();

let oldOnActiveConversationInfoUpdated: any = null;
let newOnActiveConversationInfoUpdated: any = null;

/**
 * Gets a formatted timestamp string
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Gets the Bitmoji icon URL for a user
 */
function getBitmojiIconUrl(user: any): string | undefined {
  const { bitmoji_avatar_id: bitmojiAvatarId, bitmoji_selfie_id: bitmojiSelfieId } = user;

  if (bitmojiSelfieId != null && bitmojiAvatarId != null) {
    return `https://sdk.bitmoji.com/render/panel/${bitmojiSelfieId}-${bitmojiAvatarId}-v1.webp?transparent=1&trim=circle&scale=1`;
  }
  if (bitmojiAvatarId != null) {
    return `https://sdk.bitmoji.com/render/panel/${bitmojiAvatarId}-v1.webp?transparent=1&trim=circle&scale=1`;
  }
  return undefined;
}

/**
 * Checks if a user should be ignored based on settings
 */
function shouldIgnoreUser(user: any, conversationTitle: string): boolean {
  const ntfyIgnoredNames = settings.getSetting('NTFY_IGNORED_NAMES');
  const ignoredNames = typeof ntfyIgnoredNames === 'string' ? JSON.parse(ntfyIgnoredNames) : [];

  return (
    ignoredNames.includes(user.display_name) ||
    ignoredNames.includes(user.username) ||
    ignoredNames.includes(conversationTitle)
  );
}

/**
 * Sends a browser notification for presence events
 */
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
}): Notification | null {
  const conversationTitle = conversation?.title ?? 'your Chat';

  if (!isPresenceTypeEnabled(presenceState)) {
    return null;
  }

  if (shouldIgnoreUser(user, conversationTitle)) {
    return null;
  }

  const { username, display_name: displayName } = user;
  const navigationPath = `/web/${conversationId}`;
  const action = PresenceActionMap[presenceState](conversationTitle);
  const iconUrl = getBitmojiIconUrl(user);

  const notificationOptions: NotificationOptions = {
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

/**
 * Checks if a presence state type is enabled for logging
 */
function isPresenceTypeEnabled(presenceState: PresenceState): boolean {
  const loggingTypes = settings.getSetting('PRESENCE_LOGGING_TYPES');
  try {
    const types = typeof loggingTypes === 'string' ? JSON.parse(loggingTypes) : [];
    return types.includes(presenceState);
  } catch {
    return true; // Default to enabled if parsing fails
  }
}

/**
 * Logs a presence event with optional timestamp
 */
function logPresenceEvent(user: any, presenceState: PresenceState, conversationTitle: string): void {
  if (!isPresenceTypeEnabled(presenceState)) {
    return;
  }

  const showTimestamp = settings.getSetting('PRESENCE_LOGGING_SHOW_TIMESTAMP');
  const action = PresenceActionMap[presenceState](conversationTitle);
  const userName = user.display_name ?? user.username;

  if (showTimestamp) {
    const timestamp = getTimestamp();
    logInfo(`[${timestamp}] ${userName}:`, action);
  } else {
    logInfo(`${userName}:`, action);
  }
}

const userPresenceMap: Map<string, PresenceState> = new Map();
const userPresenceTracking: Map<string, boolean> = new Map();

/**
 * Serializes a user ID and conversation ID into a unique key
 */
const serializeUserConversationId = (userId: string, conversationId?: string): string =>
  `${userId}:${conversationId ?? 'direct'}`;

/**
 * Handles active conversation info updates and tracks presence changes
 */
async function handleOnActiveConversationInfoUpdated(activeConversationInfo: any): Promise<void> {
  const halfSwipeNotificationEnabled = settings.getSetting('HALF_SWIPE_NOTIFICATION');
  const presenceLoggingEnabled = settings.getSetting('PRESENCE_LOGGING');

  const currentlyPeekingUsers = new Set<string>();
  const currentlyTypingOrIdleUsers = new Set<string>();
  const currentlyPresentUsers = new Set<string>();

  // Process all conversations
  for (const [
    conversationId,
    { peekingParticipants, typingParticipants, presentParticipants },
  ] of activeConversationInfo.entries()) {
    const conversation = getConversation(conversationId)?.conversation;
    const conversationTitle = conversation?.title ?? 'your Chat';

    // Track currently present users
    if (presentParticipants && Array.isArray(presentParticipants)) {
      for (const userId of presentParticipants) {
        const serializedId = serializeUserConversationId(userId, conversationId);
        currentlyPresentUsers.add(serializedId);
      }
    }

    // Handle peeking participants
    for (const userId of peekingParticipants) {
      const user = await getSnapchatPublicUser(userId);
      const serializedId = serializeUserConversationId(userId, conversationId);
      const previousState = userPresenceMap.get(serializedId);

      currentlyPeekingUsers.add(serializedId);

      if (previousState === PresenceState.PEEKING) {
        continue;
      }

      if (presenceLoggingEnabled) {
        logPresenceEvent(user, PresenceState.PEEKING, conversationTitle);
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

    // Handle typing/idle participants
    for (const { userId, typingState } of typingParticipants) {
      const user = await getSnapchatPublicUser(userId);
      const presenceState = typingState === 1 ? PresenceState.TYPING : PresenceState.IDLE;
      const serializedId = serializeUserConversationId(userId, conversationId);
      const previousState = userPresenceMap.get(serializedId);

      currentlyTypingOrIdleUsers.add(serializedId);

      // Mark as present if they're in presentParticipants
      const isInPresentParticipants = presentParticipants && presentParticipants.includes(userId);
      if (isInPresentParticipants && !userPresenceTracking.get(serializedId)) {
        userPresenceTracking.set(serializedId, true);
      }

      if (previousState === presenceState) {
        continue;
      }

      if (presenceLoggingEnabled) {
        logPresenceEvent(user, presenceState, conversationTitle);
      }

      userPresenceMap.set(serializedId, presenceState);
    }

    // Handle users who joined (in presentParticipants but not previously tracked)
    if (presentParticipants && Array.isArray(presentParticipants)) {
      for (const userId of presentParticipants) {
        const serializedId = serializeUserConversationId(userId, conversationId);
        const wasPreviouslyPresent = userPresenceTracking.get(serializedId);
        const isPeeking = peekingParticipants.includes(userId);
        const isTyping = typingParticipants.some((tp: any) => tp.userId === userId);

        // Only log "joined" if user is not actively typing or peeking and wasn't previously tracked
        if (!wasPreviouslyPresent && !isPeeking && !isTyping) {
          userPresenceTracking.set(serializedId, true);

          if (presenceLoggingEnabled || halfSwipeNotificationEnabled) {
            const user = await getSnapchatPublicUser(userId);

            if (presenceLoggingEnabled) {
              logPresenceEvent(user, PresenceState.JOINED, conversationTitle);
            }

            if (halfSwipeNotificationEnabled) {
              sendPresenceNotification({
                user,
                conversation,
                conversationId,
                presenceState: PresenceState.JOINED,
              });
            }
          }
        } else if (!wasPreviouslyPresent && !isPeeking) {
          // Mark as present if they're typing (but not peeking) to track for leave detection
          userPresenceTracking.set(serializedId, true);
        }
      }
    }
  }

  // Handle users who left (were present but are no longer in presentParticipants)
  for (const [serializedId, wasPresent] of userPresenceTracking.entries()) {
    if (wasPresent && !currentlyPresentUsers.has(serializedId)) {
      // Don't log "left" if user is currently peeking
      if (currentlyPeekingUsers.has(serializedId)) {
        continue;
      }

      userPresenceTracking.delete(serializedId);

      if (presenceLoggingEnabled || halfSwipeNotificationEnabled) {
        const parts = serializedId.split(':');
        if (parts[0] && parts[1]) {
          const userId = parts[0];
          const conversationId = parts[1] === 'direct' ? undefined : parts[1];
          const user = await getSnapchatPublicUser(userId);
          const conversation = conversationId ? getConversation(conversationId)?.conversation : null;
          const conversationTitle = conversation?.title ?? 'your Chat';

          if (presenceLoggingEnabled) {
            logPresenceEvent(user, PresenceState.LEFT, conversationTitle);
          }

          if (halfSwipeNotificationEnabled) {
            sendPresenceNotification({
              user,
              conversation,
              conversationId,
              presenceState: PresenceState.LEFT,
            });
          }
        }
      }
    }
  }

  // Clean up peeking state for users who stopped peeking
  for (const [serializedId, state] of userPresenceMap.entries()) {
    if (state === PresenceState.PEEKING && !currentlyPeekingUsers.has(serializedId)) {
      userPresenceMap.delete(serializedId);
    }
  }

  // Clean up typing/idle state for users who stopped typing/idling
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
    settings.on('PRESENCE_LOGGING_TYPES.setting:update', () => this.load());
    settings.on('PRESENCE_LOGGING_SHOW_TIMESTAMP.setting:update', () => this.load());
  }

  load(presenceClient?: any): void {
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
      newOnActiveConversationInfoUpdated = null;
      userPresenceMap.clear();
      userPresenceTracking.clear();
    }

    if (Object.keys(changedValues).length === 0) {
      return;
    }

    store.setState({ presence: { ...presenceClient, ...changedValues } });
  }
}

export default new PresenceLogging();
