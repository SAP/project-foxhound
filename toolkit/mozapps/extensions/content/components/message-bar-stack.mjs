/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class MessageBarStackElement extends HTMLElement {
  constructor() {
    super();
    this._observer = null;
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.append(this.constructor.template.content.cloneNode(true));
  }

  connectedCallback() {
    // Close any message bar that should be allowed based on the
    // maximum number of message bars.
    this.closeMessageBars();

    // Observe mutations to close older bars when new ones have been
    // added.
    this._observer = new MutationObserver(() => {
      this._observer.disconnect();
      this.closeMessageBars();
      this._observer.observe(this, { childList: true });
    });
    this._observer.observe(this, { childList: true });
  }

  disconnectedCallback() {
    this._observer.disconnect();
    this._observer = null;
  }

  closeMessageBars() {
    const { maxMessageBarCount } = this;
    if (maxMessageBarCount > 1) {
      // Remove the older message bars if the stack reached the
      // maximum number of message bars allowed.
      while (this.childElementCount > maxMessageBarCount) {
        this.firstElementChild.remove();
      }
    }
  }

  get maxMessageBarCount() {
    return parseInt(this.getAttribute("max-message-bar-count"), 10);
  }

  static get template() {
    const template = document.createElement("template");

    const style = document.createElement("style");
    // Render the stack in the reverse order if the stack has the
    // reverse attribute set.
    style.textContent = `
      :host {
        display: block;
      }
      :host([reverse]) > slot {
        display: flex;
        flex-direction: column-reverse;
      }
    `;
    template.content.append(style);
    template.content.append(document.createElement("slot"));

    Object.defineProperty(this, "template", {
      value: template,
    });

    return template;
  }
}
customElements.define("message-bar-stack", MessageBarStackElement);
