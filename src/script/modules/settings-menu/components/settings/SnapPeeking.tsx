import React from 'react';
import useSettingState from '@hooks/useSettingState';
import { Switch } from '@mantine/core';

const NAME = 'Snap Peeking';
const DESCRIPTION = 'Preview snaps without marking them as opened';

function SnapPeeking() {
  const [enabled, setEnabled] = useSettingState('SNAP_PEEKING');
  return <Switch label={NAME} description={DESCRIPTION} checked={enabled} onChange={() => setEnabled(!enabled)} />;
}

export default {
  name: NAME,
  description: DESCRIPTION,
  category: 'Privacy',
  component: SnapPeeking,
};
