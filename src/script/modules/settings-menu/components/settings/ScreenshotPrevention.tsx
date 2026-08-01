import React from 'react';
import useSettingState from '@hooks/useSettingState';
import { Switch } from '@mantine/core';

const NAME = 'Screenshot Detection Bypass';
const DESCRIPTION = "Bypass Snapchat's screenshot detection.";

function AllowScreenshot() {
  const [enabled, setEnabled] = useSettingState('ALLOW_SCREENSHOT');
  return <Switch label={NAME} description={DESCRIPTION} checked={enabled} onChange={() => setEnabled(!enabled)} />;
}

export default {
  name: NAME,
  description: DESCRIPTION,
  category: 'Privacy',
  component: AllowScreenshot,
};
