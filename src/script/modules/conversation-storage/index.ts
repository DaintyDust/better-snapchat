import { Module } from "../../class/Module";
import { Settings } from "../../class/Settings";
import { getConversations, getPublicUser } from "../../utils/store";
import { GlobalState } from "../../class/GlobalState";
import { Logger } from "../../utils/logger";

class ConversationStorage extends Module {
  constructor() {
    super("Conversation Storage");
    
    // Re-run storage when these settings change
    Settings.on("NTFY_ENABLED.setting:update", () => this.load());
    
    // Initial delay to ensure Snapchat loads first
    setTimeout(() => this.load(), 5000);
    
    // Initialize user info scraping
    this.initializeUserInfo();
  }

  load() {
    this.setTagsInputData();
  }

  initializeUserInfo() {
    try {
      const state = GlobalState.getState();
      if (!state) {
        setTimeout(() => this.initializeUserInfo(), 1000);
        return;
      }

      const { auth } = state;
      if (!auth?.userId) {
        setTimeout(() => this.initializeUserInfo(), 1000);
        return;
      }

      const userId = auth.userId;
      const me = auth.me;

      if (userId) Settings.setSetting("USER_ID", userId);
      if (me) Settings.setSetting("USER_INFO", me);

    } catch (error) {
      // Fail silently to avoid console detection
      // Logger.error("UserInfo: Error initializing", error);
      setTimeout(() => this.initializeUserInfo(), 1000);
    }
  }

  async setTagsInputData() {
    try {
      const conversations = getConversations();
      if (!conversations) return;

      // 1. Process Conversations (Fixing Duplicate Names)
      const seenTitles = new Map<string, number>();
      
      const groupChatTitles = Object.entries(conversations).reduce((acc, [id, data]) => {
        const conversation = data.conversation;
        
        if (conversation && conversation.title) {
          // Normalize title safely
          let title = typeof conversation.title === 'string' 
            ? conversation.title 
            : (conversation.title?.title || String(conversation.title));

          // BUG FIX: Deduplication Logic
          // If title exists, increment count and append ID segment
          if (seenTitles.has(title)) {
            const count = seenTitles.get(title)! + 1;
            seenTitles.set(title, count);
            
            // Create unique name: "Group Name (a1b2)"
            const uniqueSuffix = id.substring(0, 4);
            acc[id] = `${title} (${uniqueSuffix})`; 
          } else {
            seenTitles.set(title, 1);
            acc[id] = title;
          }
        }
        return acc;
      }, {} as Record<string, string>);

      // 2. Process Friends/Users
      const friends = GlobalState.getState()?.user?.mutuallyConfirmedFriendIds || [];
      const currentUserId = Settings.getSetting("USER_ID");
      const ignoredUsernames = ["myai", "snapchatai", "teamsnapchat"];
      
      const usersList: any[] = [];

      for (const friend of friends) {
        const userId = friend.str;
        if (userId === currentUserId) continue;

        const userProfile = await getPublicUser(userId);
        if (userProfile) {
          const username = (userProfile.mutable_username || userProfile.username || "").toLowerCase();
          if (!ignoredUsernames.includes(username)) {
            usersList.push(userProfile);
          }
        }
      }

      // 3. Validation and Saving
      const totalChats = Object.keys(friends).length + Object.keys(conversations).length;
      
      // Optimization: Only save if data has changed significantly to reduce disk writes
      const storedData = Settings.getSetting("STORED_CONVERSATIONS_NAMES");
      const parsedData = storedData ? JSON.parse(storedData) : null;

      if (parsedData && parsedData.totalChats > 0) {
        const prevTotal = parsedData.totalChats;
        // If chat count hasn't changed by much, skip saving to avoid detection vectors
        if (Math.abs(totalChats - prevTotal) < prevTotal * 0.5 || totalChats < prevTotal * 0.5) {
          return;
        }
      }

      Settings.setSetting("STORED_CONVERSATIONS_NAMES", JSON.stringify({
        groupChatTitles,
        users: usersList,
        totalChats
      }));

    } catch (error) {
      // Critical: Catch all errors to prevent the "Uncaught Error" banner in console
      console.debug("BS-Storage: Update suppressed.");
    }
  }
}

export default new ConversationStorage();
