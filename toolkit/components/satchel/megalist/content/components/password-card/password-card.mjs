/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/* eslint-disable-next-line import/no-unassigned-import */
import "chrome://global/content/megalist/components/login-line/login-line.mjs";

const DIRECTIONS = {
  ArrowUp: -1,
  ArrowLeft: -1,
  ArrowDown: 1,
  ArrowRight: 1,
};

export class PasswordCard extends MozLitElement {
  /**
   * Hardcoded heights of the password card component.
   */
  static DEFAULT_PASSWORD_CARD_HEIGHT = 210 + 16; // 16px for top and bottom margin
  static WITH_ALERT_PASSWORD_CARD_HEIGHT = 262 + 16; // alert adds 52px

  static properties = {
    origin: { type: Object },
    username: { type: Object },
    password: { type: Object },
    messageToViewModel: { type: Function },
    reauthCommandHandler: { type: Function },
    onPasswordRevealClick: { type: Function },
    handleEditButtonClick: { type: Function },
    handleViewAlertClick: { type: Function },
  };

  static get queries() {
    return {
      originLine: ".line-item[linetype='origin']",
      usernameLine: ".line-item[linetype='username']",
      passwordLine: "concealed-login-line",
      editBtn: ".edit-button",
      viewAlertBtn: ".view-alert-button",
    };
  }

  static hasAlert({ origin, username, password }) {
    return origin.breached || !username.value.length || password.vulnerable;
  }

  static getItemHeight(item) {
    return PasswordCard.hasAlert(item)
      ? PasswordCard.WITH_ALERT_PASSWORD_CARD_HEIGHT
      : PasswordCard.DEFAULT_PASSWORD_CARD_HEIGHT;
  }

  #focusableElementsList;
  #focusableElementsMap;

  #countAlerts() {
    return (
      this.origin.breached +
      !this.username.value.length +
      this.password.vulnerable
    );
  }

  async firstUpdated() {
    this.#focusableElementsMap = new Map();
    const buttons = this.shadowRoot.querySelectorAll("moz-button");
    const lineItems = this.shadowRoot.querySelectorAll(".line-item");

    let index = 0;
    for (const el of lineItems) {
      if (el === this.passwordLine) {
        await el.updateComplete;
        this.#focusableElementsMap.set(el.loginLine, index++);
        this.#focusableElementsMap.set(el.revealBtn.buttonEl, index++);
      } else {
        this.#focusableElementsMap.set(el, index++);
      }
    }

    for (const el of buttons) {
      this.#focusableElementsMap.set(el.buttonEl, index);
      index++;
    }

    this.#focusableElementsList = Array.from(this.#focusableElementsMap.keys());
  }

  #handleKeydown(e) {
    const element = e.composedTarget;
    const index = this.#focusableElementsMap.get(element);
    const numElements = this.#focusableElementsList.length;

    const focusInternal = offset => {
      const newIndex = index + offset;

      if (index == null) {
        return;
      }

      if (newIndex < 0 || newIndex >= numElements) {
        return;
      }

      this.#focusableElementsList[newIndex]?.focus();
      e.stopPropagation();
      e.preventDefault();
    };

    const isLoginLine = element === this.passwordLine.loginLine;
    const isRevealBtn = element === this.passwordLine.revealBtn.buttonEl;

    switch (e.code) {
      case "ArrowUp":
        e.preventDefault();
        if (isRevealBtn) {
          this.usernameLine?.focus();
          e.stopPropagation();
        } else if (index != 0) {
          focusInternal(DIRECTIONS[e.code]);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (isLoginLine || isRevealBtn) {
          this.editBtn?.focus();
          e.stopPropagation();
        } else if (index != numElements - 1) {
          focusInternal(DIRECTIONS[e.code]);
        }
        break;
      case "ArrowLeft":
        if (isRevealBtn) {
          focusInternal(DIRECTIONS[e.code]);
        }
        break;
      case "ArrowRight":
        if (isLoginLine) {
          focusInternal(DIRECTIONS[e.code]);
        } else if (isRevealBtn) {
          e.preventDefault();
        }
        break;
    }
  }

  focusByKeyEvent(e) {
    if (e.key === "ArrowUp") {
      if (PasswordCard.hasAlert(this)) {
        this.viewAlertBtn.focus();
      } else {
        this.editBtn.focus();
      }
    } else if (e.key === "ArrowDown") {
      this.originLine.focus();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", e => this.#handleKeydown(e), {
      capture: true,
    });
  }

  handleCommand(commandId, lineIndex) {
    this.messageToViewModel("Command", { commandId, snapshotId: lineIndex });
  }

  #recordInteractionType(type) {
    Glean.contextualManager.recordsInteraction.record({
      interaction_type: type,
    });
  }

  async onEditButtonClick() {
    this.#recordInteractionType("edit");
    const isAuthenticated = await this.reauthCommandHandler(() =>
      this.messageToViewModel("Command", {
        commandId: "Edit",
        snapshotId: this.password.lineIndex,
      })
    );

    if (!isAuthenticated) {
      return;
    }

    this.handleEditButtonClick();
  }

  onViewAlertClick() {
    this.handleViewAlertClick();
    this.#recordInteractionType("view_alert");
  }

  #onOriginLineClick(lineIndex) {
    this.handleCommand("OpenLink", lineIndex);
    this.#recordInteractionType("url_navigate");
  }

  #onCopyButtonClick(lineIndex) {
    this.handleCommand("Copy", lineIndex);
  }

  renderOriginField() {
    const dataL10nId = this.origin.breached
      ? "contextual-manager-origin-login-line-with-alert"
      : "contextual-manager-origin-login-line";
    return html`
      <login-line
        tabindex="-1"
        role="option"
        class="line-item"
        data-l10n-id=${dataL10nId}
        data-l10n-args=${JSON.stringify({ url: this.origin.value })}
        inputType="text"
        lineType="origin"
        labelL10nId="contextual-manager-passwords-origin-label"
        .value=${this.origin.value}
        .favIcon=${this.origin.valueIcon}
        ?alert=${this.origin.breached}
        .onLineClick=${() => {
          this.#onOriginLineClick(this.origin.lineIndex);
          return true;
        }}
      >
      </login-line>
    `;
  }

  renderUsernameField() {
    const dataL10nId = !this.username.value.length
      ? "contextual-manager-username-login-line-with-alert"
      : "contextual-manager-username-login-line";
    return html`
      <login-line
        tabindex="-1"
        role="option"
        class="line-item"
        data-l10n-id=${dataL10nId}
        data-l10n-args=${JSON.stringify({ username: this.username.value })}
        inputType="text"
        lineType="username"
        labelL10nId="contextual-manager-passwords-username-label"
        .value=${this.username.value}
        .onLineClick=${() => {
          this.#onCopyButtonClick(this.username.lineIndex);
          this.#recordInteractionType("copy_username");
          return true;
        }}
        ?alert=${!this.username.value.length}
      >
      </login-line>
    `;
  }

  renderPasswordField() {
    return html`
      <concealed-login-line
        class="line-item"
        labelL10nId="contextual-manager-passwords-password-label"
        .value=${this.password.value}
        .visible=${!this.password.concealed}
        ?alert=${this.password.vulnerable}
        .onLineClick=${() => {
          this.#recordInteractionType("copy_password");
          return this.reauthCommandHandler(() => {
            this.#onCopyButtonClick(this.password.lineIndex);
          });
        }}
        .onButtonClick=${() => {
          const interactionType = this.password.concealed
            ? "view_password"
            : "hide_password";
          this.#recordInteractionType(interactionType);
          return this.reauthCommandHandler(() =>
            this.onPasswordRevealClick(
              this.password.concealed,
              this.password.lineIndex
            )
          );
        }}
      >
      </concealed-login-line>
    `;
  }

  renderButton() {
    return html`<div class="edit-line-container" role="option">
      <moz-button
        tabindex="-1"
        data-l10n-id="contextual-manager-edit-login-button"
        class="edit-button"
        @click=${this.onEditButtonClick}
      ></moz-button>
    </div>`;
  }

  renderViewAlertField() {
    const alertCountArg = JSON.stringify({ count: this.#countAlerts() });

    if (!PasswordCard.hasAlert(this)) {
      return "";
    }

    const getIconSrc = () => {
      return document.dir === "rtl"
        ? // eslint-disable-next-line mozilla/no-browser-refs-in-toolkit
          "chrome://browser/skin/back.svg"
        : // eslint-disable-next-line mozilla/no-browser-refs-in-toolkit
          "chrome://browser/skin/forward.svg";
    };

    return html`
      <moz-message-bar
        type="warning"
        data-l10n-id="contextual-manager-view-alert-heading-2"
        data-l10n-args=${alertCountArg}
      >
        <moz-button
          class="view-alert-button"
          data-l10n-id="contextual-manager-view-alert-button-2"
          data-l10n-args=${alertCountArg}
          tabindex="-1"
          slot="actions"
          type="icon"
          iconSrc=${getIconSrc()}
          @click=${this.onViewAlertClick}
        >
        </moz-button>
      </moz-message-bar>
    `;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/content/megalist/components/password-card/password-card.css"
      />
      ${this.renderOriginField()} ${this.renderUsernameField()}
      ${this.renderPasswordField()} ${this.renderButton()}
      ${this.renderViewAlertField()}
    `;
  }
}

customElements.define("password-card", PasswordCard);
