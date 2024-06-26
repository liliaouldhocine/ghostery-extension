/**
 * Ghostery Browser Extension
 * https://www.ghostery.com/
 *
 * Copyright 2017-present Ghostery GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0
 */

export function showIframe(url, width = '440px') {
  const wrapper = document.createElement('ghostery-iframe-wrapper');

  const shadowRoot = wrapper.attachShadow({ mode: 'closed' });
  const template = document.createElement('template');

  template.innerHTML = /*html*/ `
    <iframe src="${url}" frameborder="0"></iframe>
    <style>
      :host {
        all: initial;
        display: flex !important;
        align-items: flex-end;
        position: fixed;
        top: 10px;
        right: 10px;
        left: 10px;
        bottom: 10px;
        z-index: 2147483647;
        pointer-events: none;
      }

      iframe {
        display: block;
        flex-grow: 1;
        width: min(100%, ${width});
        pointer-events: auto;
        box-shadow: 30px 60px 160px rgba(0, 0, 0, 0.4);
        border-radius: 16px;
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.13) 0%, rgba(0, 0, 0, 0.27) 100%);
        opacity: 0;
        transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        transform: translateY(20px);
      }

      iframe.active {
        opacity: 1;
        transform: translateY(0);
      }

      @media screen and (min-width: 640px) {
        :host {
          justify-content: flex-end;
          align-items: start;
        }

        iframe {
          flex-grow: 0;
          transform: translateY(-20px);
          max-width: ${width};
        }
      }
    </style>
  `;

  shadowRoot.appendChild(template.content);
  document.documentElement.appendChild(wrapper);

  const iframe = shadowRoot.querySelector('iframe');

  setTimeout(() => {
    iframe.classList.add('active');
  }, 100);

  window.addEventListener('message', (e) => {
    switch (e.data?.type) {
      case `ghostery-resize-iframe`: {
        const { height, width } = e.data;

        iframe.style.height = height + 'px';
        if (width) {
          iframe.style.width = width + 'px';
        }
        break;
      }
      case `ghostery-close-iframe`:
        if (e.data.clear) {
          // Send clearIframe message to other pages
          chrome.runtime.sendMessage({ action: 'clearIframe', url });
        }

        if (e.data.reload) {
          window.location.reload();
        } else {
          setTimeout(() => wrapper.parentElement.removeChild(wrapper), 0);
        }
        break;
      case 'ghostery-clear-iframe':
        if (iframe.src === e.data.url) {
          setTimeout(() => wrapper.parentElement.removeChild(wrapper), 0);
        }
        break;
      default:
        break;
    }
  });
}

export function closeIframe(reload = false, clear = false) {
  // In some cases await for store.set() is not enough to propagate changes
  // so we need to wait a bit before sending the message
  setTimeout(() => {
    window.parent.postMessage(
      { type: `ghostery-close-iframe`, reload, clear },
      '*',
    );
  }, 100);
}

export function setupIframe(width) {
  const resizeObserver = new ResizeObserver(() => {
    window.parent.postMessage(
      {
        type: `ghostery-resize-iframe`,
        height: document.body.clientHeight,
        width,
      },
      '*',
    );
  });

  resizeObserver.observe(document.body, {
    box: 'border-box',
  });

  document.body.style.overflow = 'hidden';

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'clearIframe') {
      console.log('clearIframe', msg.url);
      window.parent.postMessage(
        {
          type: `ghostery-clear-iframe`,
          url: msg.url,
        },
        '*',
      );
    }
  });
}
