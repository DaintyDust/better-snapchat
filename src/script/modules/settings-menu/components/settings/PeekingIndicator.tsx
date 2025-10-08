import React from 'react';
import useSettingState from '../../../../hooks/useSettingState';
import { Switch } from '@mantine/core';

const NAME = 'Peeking Indicator';
const DESCRIPTION = 'Show an indicator when someone is peeking at a chat or group.';

function PeekingIndicator() {
  const [enabled, setEnabled] = useSettingState('PEEKING_INDICATOR');

  const handleOnChange = React.useCallback(
    async (enabled: boolean) => {
      if (enabled && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }

      setEnabled(enabled);
    },
    [setEnabled],
  );

  return <Switch label={NAME} description={DESCRIPTION} checked={enabled} onChange={() => handleOnChange(!enabled)} />;
}

export default {
  name: NAME,
  description: DESCRIPTION,
  component: PeekingIndicator,
};
