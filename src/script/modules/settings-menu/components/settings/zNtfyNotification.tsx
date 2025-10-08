import React, { useState } from 'react';
import cx from 'clsx';
import { Switch, TextInput, Stack, Text, TagsInput, TagsInputProps, Group, Image } from '@mantine/core';
import useSettingState from '../../../../hooks/useSettingState';
import { logInfo } from '../../../../lib/debug';
import settings from '../../../../lib/settings';
import { getConversation, getMultipleSnapchatPublicUsers } from '../../../../utils/snapchat';
import { No_Bitmoji_Icon, Group_Bitmoji_Icon } from '../icons/Bitmoji';
import classes from '../tagsinputDropdowns.module.css';

const NAME = 'Ntfy Notification';
const NTFY_DESCRIPTION = 'Send your peekingnotifications to ntfy';
const NTFY_TOPIC_PLACEHOLDER = 'Enter your ntfy topic';
const NTFY_TOPIC_LABEL = 'Topic';
const NTFY_IGNORE_LABEL = 'Ignore Users/Groups';
const NTFY_IGNORE_PLACEHOLDER = 'Type a name and press Enter';
// const NOTIFICATION_DESCRIPTION =
//   'Sends a notification every time someone peeks, disable to get a notification only the first time someone peeks.';

function NtfyNotificationSettings() {
  const [ntfyEnabled, setNtfyEnabled] = useSettingState('NTFY_ENABLED');
  const [ntfyTopic, setNtfyTopic] = useSettingState('NTFY_TOPIC');
  const [ignoredNames, setIgnoredNames] = useSettingState('NTFY_IGNORED_NAMES');
  // const [multipleNotificationsEnabled, setMultipleNotificationsEnabled] = useSettingState(
  //   'MULTIPLE_NOTIFICATIONS_ENABLED',
  // );

  const parsedIgnoredNames = typeof ignoredNames === 'string' ? JSON.parse(ignoredNames) : [];
  const [groupParticipantsCache, setGroupParticipantsCache] = useState<Record<string, any[]>>({});

  const handleIgnoredNamesChange = (values: string[]) => {
    setIgnoredNames(JSON.stringify(values));
  };

  const storedConversations = settings.getSetting('STORED_CONVERSATIONS_NAMES');
  const parsedConversations =
    typeof storedConversations === 'string'
      ? JSON.parse(storedConversations)
      : { groupChatTitles: {}, users: [], totalChats: 0 };
  const groupChatTitles = Object.values(parsedConversations.groupChatTitles || {});
  const users = parsedConversations.users || [];
  const totalChats = parsedConversations.totalChats || 0;

  const filteredUsers = users
    .filter((user: any) => user != null && (user.mutable_username || user.username))
    .map((user: any) => (user.mutable_username ? user.mutable_username : user.username));

  const renderData: Record<
    string,
    {
      username: string;
      mutable_username: string;
      display_name: string;
      bitmoji_avatar_id: string;
      bitmoji_selfie_id: string;
      bitmoji_url: string;
    }
  > = users.reduce((acc: any, user: any) => {
    if (!user || (!user.mutable_username && !user.username)) {
      return acc;
    }
    const key = user.mutable_username || user.username;

    let iconUrl = undefined;
    if (user.bitmoji_selfie_id != null && user.bitmoji_avatar_id != null) {
      iconUrl = `https://sdk.bitmoji.com/render/panel/${user.bitmoji_selfie_id}-${user.bitmoji_avatar_id}-v1.webp?transparent=1&trim=circle&scale=1`;
    } else if (user.bitmoji_avatar_id != null) {
      iconUrl = `https://sdk.bitmoji.com/render/panel/${user.bitmoji_avatar_id}-v1.webp?transparent=1&trim=circle&scale=1`;
    }

    acc[key] = {
      username: user.username || '',
      mutable_username: user.mutable_username || '',
      display_name: user.display_name || '',
      bitmoji_avatar_id: user.bitmoji_avatar_id || '',
      bitmoji_selfie_id: user.bitmoji_selfie_id || '',
      bitmoji_url: iconUrl || '',
    };
    return acc;
  }, {});

  const renderTagsInputOption: TagsInputProps['renderOption'] = ({ option }) => {
    const bitmojiUrl = renderData[option.value]?.bitmoji_url;

    const groupData = parsedConversations.groupChatTitles || {};
    const isGroup = groupChatTitles.includes(option.value);
    let allParticipants: any[] = [];

    if (isGroup) {
      const conversationId = Object.keys(groupData).find((id) => groupData[id] === option.value);

      if (groupParticipantsCache[option.value]) {
        allParticipants = groupParticipantsCache[option.value] || [];
      } else {
        const conversation = getConversation(conversationId || '');

        if (conversation?.conversation?.participants) {
          const participantIds = conversation.conversation.participants.map((p: any) => p.participantId.str);

          getMultipleSnapchatPublicUsers(participantIds).then((users) => {
            if (users) {
              setGroupParticipantsCache((prev) => ({
                ...prev,
                [option.value]: users,
              }));
            }
          });
        }
      }
    }
    return (
      <Group
        className={cx({ [classes.animateOption]: true })}
        style={{ animationDelay: `${filteredUsers.concat(groupChatTitles).indexOf(option.value) * 30}ms` }}
      >
        <div className={classes.dropdownDiv}>
          {isGroup ? (
            <Group_Bitmoji_Icon size={40 * 0.8} users={allParticipants} />
          ) : bitmojiUrl ? (
            <Image src={bitmojiUrl} w={40} h={40} radius="50%" fit="cover" />
          ) : (
            <No_Bitmoji_Icon size={40} />
          )}
        </div>
        <div>
          <Text className={classes.dropdownText}>
            {renderData[option.value]?.display_name ||
              renderData[option.value]?.mutable_username ||
              renderData[option.value]?.username ||
              option.value}
          </Text>
          <Text size="xs" opacity={0.5} className={classes.dropdownText}>
            {renderData[option.value]?.mutable_username || renderData[option.value]?.username || ''}
          </Text>
        </div>
      </Group>
    );
  };

  return (
    <Stack>
      <Text size="sm" fw={500} m={0}>
        {NAME}
      </Text>
      <Stack gap="xs" pl="md">
        <Switch
          label="Enable Ntfy"
          description={NTFY_DESCRIPTION}
          checked={ntfyEnabled}
          onChange={() => setNtfyEnabled(!ntfyEnabled)}
        />
        <TextInput
          label={NTFY_TOPIC_LABEL}
          placeholder={NTFY_TOPIC_PLACEHOLDER}
          value={ntfyTopic}
          onChange={(event) => setNtfyTopic(event.currentTarget.value)}
          disabled={!ntfyEnabled}
          style={{ maxWidth: '300px' }}
        />
        {/* <Switch
          label="Allow multiple notificationss"
          description={NOTIFICATION_DESCRIPTION}
          checked={multipleNotificationsEnabled}
          onChange={() => setMultipleNotificationsEnabled(!multipleNotificationsEnabled)}
          disabled={!ntfyEnabled}
        /> */}
        <TagsInput
          label={NTFY_IGNORE_LABEL}
          placeholder={NTFY_IGNORE_PLACEHOLDER}
          value={parsedIgnoredNames}
          onChange={handleIgnoredNamesChange}
          disabled={!ntfyEnabled}
          style={{ maxWidth: '300px' }}
          maxDropdownHeight={200}
          renderOption={renderTagsInputOption}
          withScrollArea={false}
          clearable
          data={[
            { group: 'Friends', items: filteredUsers },
            { group: 'Groups', items: groupChatTitles },
          ]}
          comboboxProps={{
            withinPortal: false,
            width: 'auto',
            position: 'top-start',
            middlewares: { flip: false, shift: false },
          }}
          classNames={{
            option: classes.optionHover,
            dropdown: classes.dropdown,
            pill: classes.pill,
          }}
        />
      </Stack>
    </Stack>
  );
}

export default {
  name: [NAME, 'Enable Ntfy', NTFY_TOPIC_LABEL, NTFY_IGNORE_LABEL],
  description: [NTFY_DESCRIPTION, 'Topic for ntfy notifications', 'Ignore users or groups'],
  component: NtfyNotificationSettings,
};
