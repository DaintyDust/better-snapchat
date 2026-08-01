import React from 'react';
import { ActionIcon, Anchor, Badge, Button, FocusTrap, Group, Input, Modal, Text, UnstyledButton } from '@mantine/core';
import { IconBell, IconEye, IconMessage, IconPhoto, IconSearch, IconSettings, IconShield, IconSparkles, IconUser, IconX } from '@tabler/icons-react';
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

interface CategoryItem {
  id: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'All', label: 'All', icon: IconSparkles },
  { id: 'Privacy', label: 'Privacy', icon: IconShield },
  { id: 'Presence', label: 'Presence', icon: IconUser },
  { id: 'Messages', label: 'Messages', icon: IconMessage },
  { id: 'Media', label: 'Media', icon: IconPhoto },
  { id: 'Notifications', label: 'Notifications', icon: IconBell },
  { id: 'Advanced', label: 'Advanced', icon: IconSettings },
];

function ModalSettings({ search }: { search: string }) {
  const [activeCategory, setActiveCategory] = React.useState<string>('All');

  const categoryList = React.useMemo(() => {
    const knownIds = new Set(CATEGORIES.map((c) => c.id));
    const extraCategories: CategoryItem[] = [];

    settings.forEach((setting: SettingModule) => {
      if (setting.category && !knownIds.has(setting.category)) {
        knownIds.add(setting.category);
        extraCategories.push({
          id: setting.category,
          label: setting.category,
          icon: IconSettings,
        });
      }
    });

    return [...CATEGORIES, ...extraCategories];
  }, []);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { All: settings.length };

    categoryList.forEach((cat) => {
      if (cat.id !== 'All') {
        counts[cat.id] = 0;
      }
    });

    settings.forEach((setting: SettingModule) => {
      if (setting.category) {
        counts[setting.category] = (counts[setting.category] || 0) + 1;
      }
    });

    return counts;
  }, [categoryList]);

  const filteredSettings = React.useMemo(() => {
    let list = activeCategory === 'All' ? settings : settings.filter((s: SettingModule) => s.category === activeCategory);
    if (search.trim().length > 0) {
      const fuse = new Fuse(list, { keys: ['name', 'description'] });
      return fuse.search(search).map((result: any) => result.item);
    }
    return list;
  }, [activeCategory, search]);

  return (
    <div className="modalMainContainer">
      <div className="categorySidebar">
        {categoryList.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          return (
            <UnstyledButton key={category.id} className={`categoryButton${isActive ? ' active' : ''}`} onClick={() => setActiveCategory(category.id)}>
              <Group gap="xs" wrap="nowrap">
                <Icon size={16} className="categoryIcon" />
                <Text size="sm" fw={isActive ? 600 : 400}>
                  {category.label}
                </Text>
              </Group>
              <Badge variant={isActive ? 'filled' : 'light'} size="sm" radius="xl" color={isActive ? 'blue' : 'gray'}>
                {categoryCounts[category.id]}
              </Badge>
            </UnstyledButton>
          );
        })}
      </div>

      <div className="settingsContentArea">
        <Group justify="space-between" align="center" className="settingsContentHeader">
          <Text fw={700} size="md">
            {activeCategory}
          </Text>
          <Badge variant="filled" color="blue" size="sm" radius="xl">
            {filteredSettings.length}
          </Badge>
        </Group>

        <div className="modalSettings">
          {search.length > 0 && filteredSettings.length === 0 ? (
            <Text className="emptySettings" size="sm" c="dimmed">
              No settings found matching &quot;{search}&quot;.
            </Text>
          ) : null}
          {filteredSettings.map((setting: SettingModule) => {
            const SettingComponent = setting.component;
            const settingId = Array.isArray(setting.name) ? setting.name.join('-') : setting.name;
            return <SettingComponent key={settingId} />;
          })}
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ onClose, search, setSearch }: { onClose: () => void; search: string; setSearch: (value: string) => void }) {
  return (
    <div className="modalHeader">
      <div className="modalHeaderLeft">
        <ActionIcon size="lg" className="logo" variant="filled" component="a" href={ExternalUrls.BUY_ME_A_COFFEE} target="_blank" rel="noopener noreferrer">
          <Logo size={18} />
          <span className="donateText">Donate?</span>
        </ActionIcon>
      </div>
      <div className="modalHeaderRight">
        <FocusTrap active>
          <Input
            className="searchInput"
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
    </div>
  );
}

function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [search, setSearch] = React.useState('');
  return (
    <Modal
      withCloseButton={false}
      opened={isOpen}
      onClose={onClose}
      centered
      size="700px"
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
        <Anchor className="resetButton" component="button" onClick={() => settingsManager.setSettings(defaultSettingValues)}>
          Reset Settings
        </Anchor>
        <Text className="footerText" component="a" href={`https://github.com/DaintyDust/better-snapchat/releases`}>
          BetterSnap v{process.env.VERSION} ❤️
        </Text>
      </div>
    </Modal>
  );
}

const MemoSettingsModal = React.memo(SettingsModal, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen && prevProps.onClose === nextProps.onClose;
});

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
