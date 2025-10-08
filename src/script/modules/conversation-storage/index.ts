import settings from '../../lib/settings';
import Module from '../../lib/module';
import {
  getAllConversations,
  getSnapchatPublicUser,
  getFriends,
  getMultipleSnapchatPublicUsers,
  getSnapchatStore,
} from '../../utils/snapchat';
import { logInfo, logError } from '../../lib/debug';

function initializeUserInfo() {
  try {
    const store = getSnapchatStore();
    if (!store) {
      setTimeout(() => initializeUserInfo(), 1000);
      return;
    }

    const state = store.getState();
    if (!state?.auth?.userId) {
      setTimeout(() => initializeUserInfo(), 1000);
      return;
    }

    const userId = state.auth.userId;
    const userInfo = state.auth.me;

    if (userId) {
      settings.setSetting('USER_ID', userId);
    }

    if (userInfo) {
      settings.setSetting('USER_INFO', userInfo);
    }
  } catch (error) {
    logError('UserInfo: Error initializing, retrying...', error);
    setTimeout(() => initializeUserInfo(), 1000);
  }
}

async function setTagsInputData() {
  const GROUP_CHATS: Record<string, { conversation: { title: string } }> = getAllConversations();
  const groupChatTitles = Object.entries(GROUP_CHATS).reduce(
    (acc, [conversationId, chat]) => {
      if (chat.conversation.title) {
        const title = chat.conversation.title;
        acc[conversationId] = typeof title === 'string' ? title : (title as any)?.title || String(title);
      }
      return acc;
    },
    {} as Record<string, string>,
  );
  const FRIENDS = getFriends();
  const selfUserId = settings.getSetting('USER_ID');
  const excludedUsernames = ['myai', 'snapchatai', 'teamsnapchat'];
  const users = [];
  for (const friend of FRIENDS) {
    const userId = friend.str;
    if (userId === selfUserId) continue;

    const user = await getSnapchatPublicUser(userId);
    const username = (user.mutable_username || user.username).toLowerCase();

    if (excludedUsernames.includes(username)) continue;

    users.push(user);
  }
  const totalChats = Object.keys(FRIENDS).length + Object.keys(GROUP_CHATS).length;

  const existingSetting = settings.getSetting('STORED_CONVERSATIONS_NAMES');
  const existingData = existingSetting ? JSON.parse(existingSetting) : null;

  const newData = {
    groupChatTitles: groupChatTitles,
    users: users,
    totalChats: totalChats,
  };

  if (existingData && existingData.totalChats > 0) {
    const existingTotal = existingData.totalChats;
    const hasSignificantChange = Math.abs(newData.totalChats - existingTotal) < existingTotal * 0.5;

    if (!hasSignificantChange || newData.totalChats < existingTotal * 0.5) {
      return;
    }
  }

  settings.setSetting('STORED_CONVERSATIONS_NAMES', JSON.stringify(newData));
}

class StoreConversation extends Module {
  constructor() {
    super('Conversation Storage');
    settings.on('NTFY_ENABLED.setting:update', () => this.load());
    setTimeout(() => this.load(), 5000);
    initializeUserInfo();
  }

  load() {
    setTagsInputData();
  }
}

export default new StoreConversation();
