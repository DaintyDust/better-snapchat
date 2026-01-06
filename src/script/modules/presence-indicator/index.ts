import settings from '../../lib/settings';
import Module from '../../lib/module';
import { getConversation, getSnapchatPublicUser, getSnapchatStore } from '../../utils/snapchat';
import styles from './index.module.css';

const store = getSnapchatStore();

let oldOnActiveConversationInfoUpdated: any = null;
let newOnActiveConversationInfoUpdated: any = null;

const currentlyPresentUsers = new Set<string>();

function getConversationContainerElementFromId(conversationId: string) {
  const element = document.getElementById(`title-${conversationId}`);
  return element?.closest('div[role="listitem"]');
}

function addPresenceIndicator(container: Element, conversationId: string, userId: string) {
  // Try to find the name area or bitmoji area
  const O4POsElement = container.querySelector('.O4POs');
  if (!O4POsElement) {
    return;
  }

  // Check if indicator already exists for this user
  const existingIndicator = container.querySelector(`.${styles.presenceDot}[data-user-id="${userId}"]`);
  if (existingIndicator) {
    return;
  }

  // Create the presence dot
  const presenceDot = document.createElement('div');
  presenceDot.className = styles.presenceDot;
  presenceDot.setAttribute('data-user-id', userId);
  presenceDot.setAttribute('data-conversation-id', conversationId);
  presenceDot.setAttribute('aria-label', 'User is present');

  // Find the FiLwP span which contains the name text
  const nameSpan = container.querySelector('span.FiLwP');

  if (nameSpan) {
    // Insert the dot directly after the FiLwP span
    nameSpan.insertAdjacentElement('afterend', presenceDot);

    // Ensure the parent container (mYSR9 span) displays inline
    const parentSpan = nameSpan.parentElement as HTMLElement;
    if (parentSpan) {
      parentSpan.style.display = 'inline';
      parentSpan.style.verticalAlign = 'baseline';
    }
  } else {
    // Fallback: try to find any span with the name and insert after it
    const titleSpan = container.querySelector('[id^="title-"]');
    if (titleSpan) {
      const innerSpan = titleSpan.querySelector('span.FiLwP') || titleSpan.querySelector('span');
      if (innerSpan) {
        innerSpan.insertAdjacentElement('afterend', presenceDot);
        const parent = innerSpan.parentElement as HTMLElement;
        if (parent) {
          parent.style.display = 'inline';
        }
      } else {
        titleSpan.insertAdjacentElement('afterend', presenceDot);
        const parent = titleSpan.parentElement as HTMLElement;
        if (parent) {
          parent.style.display = 'inline';
        }
      }
    } else {
      // Last resort: add to O4POs element
      O4POsElement.appendChild(presenceDot);
    }
  }
}

function removePresenceIndicator(conversationId: string, userId: string) {
  const container = getConversationContainerElementFromId(conversationId);
  if (container) {
    const indicator = container.querySelector(`.${styles.presenceDot}[data-user-id="${userId}"]`);
    if (indicator) {
      indicator.classList.add(styles.fadeOut);
      setTimeout(() => {
        indicator.remove();
      }, 300); // Match fade out animation duration
    }
  }
}

function updatePresenceIndicators(conversationId: string, presentUserIds: string[]) {
  const container = getConversationContainerElementFromId(conversationId);
  if (!container) {
    return;
  }

  // Get all current indicators for this conversation
  const existingIndicators = container.querySelectorAll(
    `.${styles.presenceDot}[data-conversation-id="${conversationId}"]`,
  );
  const existingUserIds = new Set<string>();

  existingIndicators.forEach((indicator) => {
    const userId = indicator.getAttribute('data-user-id');
    if (userId) {
      existingUserIds.add(userId);
    }
  });

  // Add indicators for new present users
  for (const userId of presentUserIds) {
    if (!existingUserIds.has(userId)) {
      addPresenceIndicator(container, conversationId, userId);
    }
  }

  // Remove indicators for users who are no longer present
  for (const userId of existingUserIds) {
    if (!presentUserIds.includes(userId)) {
      removePresenceIndicator(conversationId, userId);
    }
  }
}

async function handleOnActiveConversationInfoUpdated(activeConversationInfo: any) {
  const presenceIndicatorEnabled = settings.getSetting('PRESENCE_INDICATOR');
  if (!presenceIndicatorEnabled) {
    // Clear all indicators if disabled
    for (const serializedId of currentlyPresentUsers) {
      const parts = serializedId.split(':');
      if (parts.length >= 2) {
        const userId = parts[0];
        const conversationId = parts[1] === 'direct' ? undefined : parts[1];
        if (conversationId && userId) {
          removePresenceIndicator(conversationId, userId);
        }
      }
    }
    currentlyPresentUsers.clear();
    return;
  }

  const newPresentUsers = new Set<string>();

  // Process all conversations
  for (const [conversationId, { presentParticipants }] of activeConversationInfo.entries()) {
    if (presentParticipants && Array.isArray(presentParticipants)) {
      const presentUserIds: string[] = [];

      for (const userId of presentParticipants) {
        const serializedId = `${userId}:${conversationId}`;
        newPresentUsers.add(serializedId);
        presentUserIds.push(userId);
      }

      // Update indicators for this conversation
      updatePresenceIndicators(conversationId, presentUserIds);
    }
  }

  // Remove indicators for users who are no longer present in any conversation
  for (const serializedId of currentlyPresentUsers) {
    if (!newPresentUsers.has(serializedId)) {
      const parts = serializedId.split(':');
      if (parts.length >= 2) {
        const userId = parts[0];
        const conversationId = parts[1] === 'direct' ? undefined : parts[1];
        if (conversationId && userId) {
          removePresenceIndicator(conversationId, userId);
        }
      }
    }
  }

  // Update the set of currently present users
  currentlyPresentUsers.clear();
  newPresentUsers.forEach((id) => currentlyPresentUsers.add(id));
}

class PresenceIndicator extends Module {
  private isLoading = false;

  constructor() {
    super('Presence Indicator');
    store.subscribe((storeState: any) => storeState.presence, this.load.bind(this));
    settings.on('PRESENCE_INDICATOR.setting:update', () => this.load());
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

      const presenceIndicatorEnabled = settings.getSetting('PRESENCE_INDICATOR');
      const changedValues: any = {};

      if (
        presenceIndicatorEnabled &&
        presenceClient.onActiveConversationInfoUpdated !== newOnActiveConversationInfoUpdated
      ) {
        oldOnActiveConversationInfoUpdated = presenceClient.onActiveConversationInfoUpdated;

        newOnActiveConversationInfoUpdated = new Proxy(oldOnActiveConversationInfoUpdated, {
          apply(targetFunc: any, thisArg: any, [activeConversationPayload, ...rest]: any) {
            handleOnActiveConversationInfoUpdated(activeConversationPayload);
            return Reflect.apply(targetFunc, thisArg, [activeConversationPayload, ...rest]);
          },
        });

        changedValues.onActiveConversationInfoUpdated = newOnActiveConversationInfoUpdated;
      }

      if (!presenceIndicatorEnabled && oldOnActiveConversationInfoUpdated != null) {
        changedValues.onActiveConversationInfoUpdated = oldOnActiveConversationInfoUpdated;
        oldOnActiveConversationInfoUpdated = null;
        newOnActiveConversationInfoUpdated = null;
        currentlyPresentUsers.clear();

        // Clear all indicators
        document.querySelectorAll(`.${styles.presenceDot}`).forEach((el) => el.remove());
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

export default new PresenceIndicator();
