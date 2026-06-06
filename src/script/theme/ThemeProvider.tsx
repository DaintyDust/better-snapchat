import React from 'react';
import { createTheme, InputWrapper, MantineColorSchemeManager, MantineProvider, Modal, Radio, Switch, SegmentedControl, TagsInput, Tooltip } from '@mantine/core';
import { getSnapchatStore } from '@utils/snapchat';

const store = getSnapchatStore();

let unsubscribe: (() => void) | undefined;

const mantineTheme = createTheme({
  primaryColor: 'indigo',
  cursorType: 'pointer',
  components: {
    Radio: Radio.extend({ defaultProps: { size: 'md', color: 'indigo' } }),
    Switch: Switch.extend({
      defaultProps: { size: 'md', color: 'indigo', withThumbIndicator: false },
      classNames: { body: 'body', track: 'track', trackLabel: 'track' },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: { color: 'indigo', radius: 'md' },
      classNames: { root: 'root' },
    }),
    TagsInput: TagsInput.extend({
      classNames: { option: 'option', dropdown: 'dropdown', pill: 'pill' },
    }),
    InputWrapper: InputWrapper.extend({
      classNames: { label: 'label' },
    }),
    Modal: Modal.extend({
      styles: () => ({
        body: { display: 'flex', flexDirection: 'column', gap: 20, padding: 20 },
        content: {
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--mantine-color-gray-light)',
        },
      }),
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        transitionProps: { transition: 'pop', duration: 200 },
        arrowSize: 8,
        withArrow: true,
        color: 'indigo',
      },
    }),
  },
});

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const colorModeManager = {
  set: () => {},
  get: () => {
    const theme = store.getState().localSettings.appTheme;
    return theme === 'system' ? getSystemTheme() : theme;
  },
  subscribe: (onUpdate) => {
    unsubscribe = store.subscribe((state: any, prevState: any) => {
      if (state.localSettings.appTheme === prevState.localSettings.appTheme) {
        return;
      }

      if (state.localSettings.appTheme === 'system') {
        onUpdate(getSystemTheme());
      } else {
        onUpdate(state.localSettings.appTheme);
      }
    });
  },
  unsubscribe: () => {
    unsubscribe?.();
    unsubscribe = undefined;
  },
  clear: () => {},
} satisfies MantineColorSchemeManager;

export default function ThemeProvider({ children, ...props }: React.PropsWithChildren<React.ComponentProps<typeof MantineProvider>>) {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <MantineProvider
      defaultColorScheme="light"
      colorSchemeManager={colorModeManager}
      theme={mantineTheme}
      cssVariablesSelector=":host > main"
      withGlobalClasses={false}
      withCssVariables
      getRootElement={() => ref.current!}
      {...props}
    >
      <main className="main" ref={ref} style={{ width: '100%', height: '100%' }}>
        {children}
      </main>
    </MantineProvider>
  );
}
