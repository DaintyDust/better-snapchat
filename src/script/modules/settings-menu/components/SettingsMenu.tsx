import React from 'react';
import { ActionIcon, Anchor, Button, FocusTrap, Input, Modal, Text } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import Logo from './icons/BetterSnap';
import DiscordIcon from './icons/Discord';
import Fuse from 'fuse.js';
import { type SettingModule } from '@app-types/client';
// @ts-ignore glob-import
import * as migrations from './settings/*.tsx';
import { defaultSettingValues, ExternalUrls, SettingIds, SettingsButtonLayout } from '@lib/constants';
import ThemeProvider from '@theme/ThemeProvider';
import settingsManager from '@lib/settings';
import { useDisclosure } from '@mantine/hooks';
import useSettingState from '@hooks/useSettingState';

const { default: settingsDefault } = migrations;
const settings = settingsDefault.map(({ default: setting }: { default: SettingModule }) => setting);

/**
 * Renders the modal body showing settings filtered by the provided search query.
 *
 * Renders an empty-state message when no matches are found, the list of matching
 * setting components, and a "Reset Settings" action when the search query is empty.
 *
 * @param search - Search query used to filter settings by name and description
 * @returns The modal body as a React element
 */
function ModalSettings({ search }: { search: string }) {
  const fuse = React.useMemo(() => new Fuse(settings, { keys: ['name', 'description'] }), []);

  const filteredSettings = React.useMemo(() => {
    if (search.length > 0) {
      return fuse.search(search).map((result) => result.item);
    }
    return settings;
  }, [search, fuse]);

  return (
    <div className="modalSettings">
      {search.length > 0 && filteredSettings.length === 0 ? <Text className="emptySettings">No settings found matching &quot;{search}&quot;.</Text> : null}
      {filteredSettings.map((setting: SettingModule) => {
        const SettingComponent = setting.component;
        const settingId = Array.isArray(setting.name) ? setting.name.join('-') : setting.name;
        return <SettingComponent key={settingId} />;
      })}
      {search.length === 0 ? (
        <Anchor className="resetButton" component="button" onClick={() => settingsManager.setSettings(defaultSettingValues)}>
          Reset Settings
        </Anchor>
      ) : null}
    </div>
  );
}

/**
 * Renders the header for the settings modal, including a logo link, a focused search input, and a close button.
 *
 * @param onClose - Callback invoked when the close button is clicked
 * @param search - Current search query shown in the input
 * @param setSearch - Function to update the search query
 * @returns The header JSX element for the settings modal
 */
function ModalHeader({ onClose, search, setSearch }: { onClose: () => void; search: string; setSearch: (value: string) => void }) {
  return (
    <div className="modalSection">
      <ActionIcon size="lg" className="logo" variant="filled" component="a" href={ExternalUrls.BUY_ME_A_COFFEE}>
        <Logo size={18} />
      </ActionIcon>
      <FocusTrap active>
        <Input
          variant="default"
          size="xs"
          autoFocus
          placeholder="Search settings"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </FocusTrap>
      <ActionIcon size="md" color="gray" variant="transparent" onClick={onClose} className="closeButton">
        <IconX />
      </ActionIcon>
    </div>
  );
}

/**
 * Render the settings modal containing a searchable settings list, header controls, and footer actions.
 *
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Callback invoked to close the modal
 * @returns The Modal React element that hosts the header (search and close), the settings content, and footer links (Discord and release/version)
 */
function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [search, setSearch] = React.useState('');
  return (
    <Modal
      withCloseButton={false}
      opened={isOpen}
      onClose={onClose}
      centered
      size="lg"
      lockScroll={false}
      withinPortal={false}
      classNames={{ body: 'modalBody', content: 'modalContent' }}
    >
      <ModalHeader onClose={onClose} search={search} setSearch={setSearch} />
      <ModalSettings search={search} />
      <div className="modalSection">
        <Button leftSection={<DiscordIcon size={18} />} variant="light" color="rgb(145, 167, 255)" component="a" href={ExternalUrls.DISCORD}>
          Join our Discord
        </Button>
        <Text className="footerText" component="a" href={`https://github.com/DaintyDust/better-snapchat/releases/tag/v${process.env.VERSION}`}>
          BetterSnap v{process.env.VERSION} ❤️
        </Text>
      </div>
    </Modal>
  );
}

const MemoSettingsModal = React.memo(SettingsModal, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen && prevProps.onClose === nextProps.onClose;
});

/**
 * Render the settings menu, its trigger button (when enabled), and the settings modal.
 *
 * Registers a global Shift+Q keyboard shortcut to toggle the modal, ignoring key presses when focus is on inputs, textareas, or contentEditable elements.
 *
 * @returns A React element containing the conditional settings button and the settings modal.
 */
function SettingsMenu() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [setting] = useSettingState(SettingIds.SETTINGS_BUTTON_LAYOUT);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        !event.shiftKey ||
        event.key !== 'Q' ||
        (document.activeElement as HTMLElement | null)?.contentEditable === 'true' ||
        (document.activeElement as HTMLElement | null)?.tagName === 'INPUT' ||
        (document.activeElement as HTMLElement | null)?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      toggle();
      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return (
    <ThemeProvider>
      {setting !== SettingsButtonLayout.HIDDEN ? (
        <ActionIcon size="xl" radius="md" className="settingsButton" variant="filled" onClick={toggle}>
          <Logo size={18} />
        </ActionIcon>
      ) : null}
      <MemoSettingsModal isOpen={opened} onClose={close} />
    </ThemeProvider>
  );
}

export default SettingsMenu;
