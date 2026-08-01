import Module from '@lib/module';
import settings from '@lib/settings';
import { logInfo } from '@lib/debug';
import { setConversationViewed } from '@modules/reset-viewing-state';
import styles from './index.scss';

function createButton() {
  const button = document.createElement('button');
  button.className = 'r0jzl BfCG7 SN8GM MarkAsReadButton';
  button.type = 'button';
  button.title = 'Mark as Read';
  button.textContent = 'Mark as Read';
  return button;
}

let styleElement: HTMLStyleElement | null = null;

class MarkAsReadButton extends Module {
  private channel: BroadcastChannel;

  constructor() {
    super('Mark As Read Button');
    this.channel = new BroadcastChannel('bettersnap_settings_sync');
    settings.on('PREVENT_CONVERSATION_READ_RECEIPTS.setting:update', () => this.load());
  }

  async load() {
    const enabled = settings.getSetting('PREVENT_CONVERSATION_READ_RECEIPTS');

    if (styleElement != null && !enabled) {
      styleElement.remove();
      styleElement = null;
    }

    if (styleElement == null && enabled) {
      styleElement = document.createElement('style');
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
    }

    if (!enabled) {
      return;
    }
    const observeConversationHeader = () => {
      const observer = new MutationObserver(() => {
        this.injectButton();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      this.injectButton();
    };

    observeConversationHeader();
  }
  private injectButton() {
    const existingButton = document.querySelector('.MarkAsReadButton') as HTMLButtonElement;
    if (existingButton) {
      return;
    }

    const button = createButton();

    button.addEventListener('click', async () => {
      logInfo('Mark as Read clicked');

      this.channel.postMessage({ action: 'FORCE_MARK_READ' });
      setConversationViewed();

      button.disabled = true;
      button.textContent = 'Marked!';
      setTimeout(() => {
        button.disabled = false;
        button.textContent = 'Mark as Read';
      }, 2000);
    });

    const callActions = document.querySelector<HTMLElement>('.kxqcc');
    if (callActions) {
      callActions.style.order = '2';
    }

    const actionButtonsHeader = document.querySelector('.k1IaM');
    if (actionButtonsHeader) {
      actionButtonsHeader.appendChild(button);
    }
  }
}

export default new MarkAsReadButton();
