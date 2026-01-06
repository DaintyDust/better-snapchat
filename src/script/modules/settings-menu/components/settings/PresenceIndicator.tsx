import React from 'react';
import useSettingState from '../../../../hooks/useSettingState';
import { Switch } from '@mantine/core';

const NAME = 'Presence Indicator';
const DESCRIPTION = 'Show a pulsing green dot next to names when users are actively present in a chat.';

function PresenceIndicator() {
  const [enabled, setEnabled] = useSettingState('PRESENCE_INDICATOR');

  return <Switch label={NAME} description={DESCRIPTION} checked={enabled} onChange={() => setEnabled(!enabled)} />;
}

export default {
  name: NAME,
  description: DESCRIPTION,
  component: PresenceIndicator,
};

