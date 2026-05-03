import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './SettingsMenu';
import Module from '@lib/module';

const APP_CONTAINER_ID = 'better-snap-app';

let appContainer: HTMLDivElement | null = null;

class SettingsMenu extends Module {
  constructor() {
    super('Settings Menu');
  }

  load(): void {
    if (document.getElementById(APP_CONTAINER_ID) != null) {
      return;
    }

    appContainer = document.createElement('div');
    appContainer.setAttribute('id', APP_CONTAINER_ID);
    document.body.appendChild(appContainer);
    createRoot(appContainer).render(React.createElement(App));

    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  handleResize() {
    if (appContainer == null) {
      return;
    }

    const { innerWidth, innerHeight } = window;
    appContainer.style.width = `${innerWidth}px`;
    appContainer.style.height = `${innerHeight}px`;
  }
}

export default new SettingsMenu();
