import React, { useState } from 'react';
import cx from 'clsx';
import { Switch, TextInput, Stack, Text, TagsInput, TagsInputProps, Group, Image, Pill } from '@mantine/core';
import useSettingState from '@hooks/useSettingState';
import settings from '@lib/settings';
import { getConversation, getMultipleSnapchatPublicUsers } from '@utils/snapchat';
import { No_Bitmoji_Icon, Group_Bitmoji_Icon } from '../icons/Bitmoji';
import classes from '../tagsinputDropdowns.module.css';

const NAME = 'Ntfy Notification';
const NTFY_DESCRIPTION = 'Send your peekingnotifications to ntfy';
const NTFY_TOPIC_PLACEHOLDER = 'Enter your ntfy topic';
const NTFY_TOPIC_LABEL = 'Topic';
const NTFY_IGNORE_LABEL = 'Ignore Users/Groups';
const NTFY_IGNORE_PLACEHOLDER = 'Type a name and press Enter';

const FRIEND_PREFIX = 'friend::';
const GROUP_PREFIX = 'group::';

const stripPrefix = (value: string) =>
  value.startsWith(FRIEND_PREFIX) ? value.slice(FRIEND_PREFIX.length) : value.startsWith(GROUP_PREFIX) ? value.slice(GROUP_PREFIX.length) : value;

const isGroupValue = (value: string) => value.startsWith(GROUP_PREFIX);
const parseStoredJson = <T,>(value: unknown, fallback: T): T => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed === null || parsed === undefined) {
        return fallback;
      }

      return parsed as T;
    } catch {
      return fallback;
    }
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return value as T;
};

function NtfyNotificationSettings() {
  const [ntfyEnabled, setNtfyEnabled] = useSettingState('NTFY_ENABLED');
  const [ntfyTopic, setNtfyTopic] = useSettingState('NTFY_TOPIC');
  const [ignoredNames, setIgnoredNames] = useSettingState('NTFY_IGNORED_NAMES');

  const parsedIgnoredNames = parseStoredJson<string[]>(ignoredNames, []);
  const [groupParticipantsCache, setGroupParticipantsCache] = useState<Record<string, any[]>>({});

  const handleIgnoredNamesChange = (values: string[]) => {
    setIgnoredNames(JSON.stringify(values));
  };

  const storedConversations = settings.getSetting('STORED_CONVERSATIONS_NAMES');
  const parsedConversations = parseStoredJson<{ groupChatTitles: Record<string, string>; users: any[]; totalChats: number }>(storedConversations, {
    groupChatTitles: {},
    users: [],
    totalChats: 0,
  });
  const groupEntries = Object.entries(parsedConversations.groupChatTitles || {});
  const users: any[] = parsedConversations.users || [];

  const seenUsernames = new Set<string>();
  const uniqueUsers = users.filter((user) => {
    if (!user?.username) return false;
    if (seenUsernames.has(user.username)) return false;
    seenUsernames.add(user.username);
    return true;
  });

  const namespacedUsers = uniqueUsers
    .filter((u) => u.mutable_username || u.username)
    .map((u) => ({
      value: `${FRIEND_PREFIX}${u.user_id}`,
      label: u.display_name || u.mutable_username || u.username,
    }));

  const namespacedGroups = groupEntries.map(([id, title]) => ({
    value: `${GROUP_PREFIX}${id}`,
    label: title as string,
  }));

  const renderData: Record<
    string,
    {
      username: string;
      mutable_username: string;
      display_name: string;
      bitmoji_url: string;
      label: string;
    }
  > = {};

  for (const user of uniqueUsers) {
    if (!user?.username) continue;
    const key = `${FRIEND_PREFIX}${user.user_id}`;
    let iconUrl = '';
    if (user.bitmoji_selfie_id && user.bitmoji_avatar_id) {
      iconUrl = `https://sdk.bitmoji.com/render/panel/${user.bitmoji_selfie_id}-${user.bitmoji_avatar_id}-v1.webp?transparent=1&trim=circle&scale=1`;
    } else if (user.bitmoji_avatar_id) {
      iconUrl = `https://sdk.bitmoji.com/render/panel/${user.bitmoji_avatar_id}-v1.webp?transparent=1&trim=circle&scale=1`;
    }
    renderData[key] = {
      username: user.username,
      mutable_username: user.mutable_username || '',
      display_name: user.display_name || '',
      bitmoji_url: iconUrl,
      label: user.display_name || user.mutable_username || user.username,
    };
  }

  for (const [id, title] of groupEntries) {
    renderData[`${GROUP_PREFIX}${id}`] = {
      username: '',
      mutable_username: '',
      display_name: title as string,
      bitmoji_url: '',
      label: title as string,
    };
  }

  const tagInputValue = parsedIgnoredNames.filter((v: any) => v.startsWith(FRIEND_PREFIX) || v.startsWith(GROUP_PREFIX));
  const allNamespacedOptions = [...namespacedUsers.map((u) => u.value), ...namespacedGroups.map((g) => g.value)];

  const renderTagsInputOption: TagsInputProps['renderOption'] = ({ option }) => {
    const data = renderData[option.value];
    const group = isGroupValue(option.value);
    const id = stripPrefix(option.value);
    let allParticipants: any[] = [];

    if (group) {
      if (groupParticipantsCache[id]) {
        allParticipants = groupParticipantsCache[id];
      } else {
        const conversation = getConversation(id);
        if (conversation?.conversation?.participants) {
          const participantIds = conversation.conversation.participants.map((p: any) => p.participantId.str);
          getMultipleSnapchatPublicUsers(participantIds).then((fetchedUsers) => {
            if (fetchedUsers) {
              setGroupParticipantsCache((prev) => ({ ...prev, [id]: fetchedUsers }));
            }
          });
        }
      }
    }

    return (
      <Group className={cx({ [classes.animateOption]: true })} style={{ animationDelay: `${allNamespacedOptions.indexOf(option.value) * 30}ms` }}>
        <div className={classes.dropdownDiv}>
          {group ? (
            <Group_Bitmoji_Icon size={40 * 0.8} users={allParticipants} />
          ) : data?.bitmoji_url ? (
            <Image src={data.bitmoji_url} w={40} h={40} radius="50%" fit="cover" />
          ) : (
            <No_Bitmoji_Icon size={40} />
          )}
        </div>
        <div>
          <Text className={classes.dropdownText}>{data?.display_name || data?.mutable_username || data?.username || stripPrefix(option.value)}</Text>
          <Text size="xs" opacity={0.5} className={classes.dropdownText}>
            {group ? data?.display_name : data?.mutable_username || data?.username || ''}
          </Text>
        </div>
      </Group>
    );
  };

  const renderPill: TagsInputProps['renderPill'] = ({ option, onRemove, disabled: pillDisabled }) => (
    <Pill withRemoveButton={!pillDisabled} onRemove={onRemove} disabled={pillDisabled}>
      {option?.label ?? stripPrefix(String(option?.value ?? ''))}
    </Pill>
  );

  return (
    <Stack>
      <Text size="sm" fw={500} m={0}>
        {NAME}
      </Text>
      <Stack gap="xs" pl="md">
        <Switch label="Enable Ntfy" description={NTFY_DESCRIPTION} checked={ntfyEnabled} onChange={() => setNtfyEnabled(!ntfyEnabled)} />
        <TextInput
          label={NTFY_TOPIC_LABEL}
          placeholder={NTFY_TOPIC_PLACEHOLDER}
          value={ntfyTopic}
          onChange={(event) => setNtfyTopic(event.currentTarget.value)}
          disabled={!ntfyEnabled}
          style={{ maxWidth: '300px' }}
        />
        <TagsInput
          label={NTFY_IGNORE_LABEL}
          placeholder={NTFY_IGNORE_PLACEHOLDER}
          value={tagInputValue}
          onChange={handleIgnoredNamesChange}
          disabled={!ntfyEnabled}
          style={{ maxWidth: '300px' }}
          maxDropdownHeight={200}
          renderPill={renderPill}
          renderOption={renderTagsInputOption}
          withScrollArea={false}
          clearable
          data={[
            { group: 'Friends', items: namespacedUsers },
            { group: 'Groups', items: namespacedGroups },
          ]}
          comboboxProps={{
            withinPortal: false,
            width: 'auto',
            position: 'top-start',
            middlewares: { flip: false, shift: false },
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
