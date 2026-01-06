import React from 'react';
import { Stack, Switch, Text, Paper } from '@mantine/core';
import useSettingState from '../../../../hooks/useSettingState';
import { PresenceState } from '../../../../lib/constants';

const NAME = 'Presence Logging';
const DESCRIPTION = 'Log presence changes to the dev-console.';

const PRESENCE_TYPE_LABELS: Record<PresenceState, string> = {
  [PresenceState.TYPING]: 'Typing',
  [PresenceState.IDLE]: 'Idle',
  [PresenceState.PEEKING]: 'Peeking',
  [PresenceState.JOINED]: 'Joined',
  [PresenceState.LEFT]: 'Left',
};

function PresenceLogging() {
  const [enabled, setEnabled] = useSettingState('PRESENCE_LOGGING');
  const [loggingTypes, setLoggingTypes] = useSettingState('PRESENCE_LOGGING_TYPES');
  const [showTimestamp, setShowTimestamp] = useSettingState('PRESENCE_LOGGING_SHOW_TIMESTAMP');

  const parsedTypes = React.useMemo(() => {
    try {
      return typeof loggingTypes === 'string' ? JSON.parse(loggingTypes) : [];
    } catch {
      return [];
    }
  }, [loggingTypes]);

  const handleTypeToggle = (type: PresenceState) => {
    const newTypes = parsedTypes.includes(type)
      ? parsedTypes.filter((t: string) => t !== type)
      : [...parsedTypes, type];
    setLoggingTypes(JSON.stringify(newTypes));
  };

  return (
    <Stack gap="xs">
      <Switch
        label={NAME}
        description={DESCRIPTION}
        checked={enabled}
        onChange={() => setEnabled(!enabled)}
      />
      {enabled && (
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Switch
              label="Show timestamps"
              description="Include timestamps in log messages"
              checked={showTimestamp}
              onChange={() => setShowTimestamp(!showTimestamp)}
            />
            <Text size="sm" fw={500} mt="xs" mb={4}>
              Log Types
            </Text>
            <Stack gap={6} pl="xs">
              {Object.entries(PRESENCE_TYPE_LABELS).map(([type, label]) => (
                <Switch
                  key={type}
                  label={label}
                  checked={parsedTypes.includes(type)}
                  onChange={() => handleTypeToggle(type as PresenceState)}
                  size="sm"
                />
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default {
  name: NAME,
  description: DESCRIPTION,
  component: PresenceLogging,
};
