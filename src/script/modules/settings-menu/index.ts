import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/SettingsMenu';
import Module from '@lib/module';
import { generateTagName } from '@utils/document';
import shadowDomStyles from './styles';

const APP_CONTAINER_ID = generateTagName();

let appContainer: ShadowDOM | null = null;

interface ShadowDOM extends HTMLElement {
  shadowRoot: ShadowRoot;
}

class AppContainer extends HTMLElement {
  constructor() {
    super();
  }
}

customElements.define(APP_CONTAINER_ID, AppContainer);

class SettingsMenu extends Module {
  constructor() {
    super('Settings Menu');
  }

  load(): void {
    if (appContainer != null) {
      return;
    }

    appContainer = document.createElement(APP_CONTAINER_ID) as ShadowDOM;
    const shadowRoot = appContainer.attachShadow({ mode: 'closed' });

    for (const style of shadowDomStyles) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(style);
      shadowRoot.adoptedStyleSheets.push(sheet);
    }

    document.documentElement.appendChild(appContainer);
    createRoot(shadowRoot).render(React.createElement(App));
  }
}

export default new SettingsMenu();
