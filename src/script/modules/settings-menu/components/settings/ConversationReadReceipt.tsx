import React from 'react';
import useSettingState from '@hooks/useSettingState';
import { Switch } from '@mantine/core';

const NAME = 'Disable Conversation Read Receipts';
const DESCRIPTION = 'Prevent conversations from being marked as read when you open them.';

function DisableReadReceipts() {
  const [enabled, setEnabled] = useSettingState('PREVENT_CONVERSATION_READ_RECEIPTS');
  return <Switch label={NAME} description={DESCRIPTION} checked={enabled} onChange={() => setEnabled(!enabled)} />;
}

export default {
  name: NAME,
  description: DESCRIPTION,
  component: DisableReadReceipts,
};
