/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";

/**
 * Like DeferredTask but usable from content.
 */
class Debounce {
  timeout = null;
  #callback = null;
  #timeoutId = null;

  constructor(callback, timeout) {
    this.#callback = callback;
    this.timeout = timeout;
    this.#timeoutId = null;
  }

  #trigger() {
    this.#timeoutId = null;
    this.#callback();
  }

  arm() {
    this.disarm();
    this.#timeoutId = setTimeout(() => this.#trigger(), this.timeout);
  }

  disarm() {
    if (this.isArmed) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
  }

  finalize() {
    if (this.isArmed) {
      this.disarm();
      this.#callback();
    }
  }

  get isArmed() {
    return this.#timeoutId !== null;
  }
}

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-card.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button-group.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-visual-picker.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/profiles/avatar.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/profiles/profiles-theme-card.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/profiles/profile-avatar-selector.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-toggle.mjs";

const SAVE_NAME_TIMEOUT = 2000;
const SAVED_MESSAGE_TIMEOUT = 5000;

/**
 * Element used for updating a profile's name, theme, and avatar.
 */
export class EditProfileCard extends MozLitElement {
  static properties = {
    hasDesktopShortcut: { type: Boolean },
    profile: { type: Object },
    profiles: { type: Array },
    themes: { type: Array },
    isCopy: { type: Boolean, reflect: true },
  };

  static queries = {
    avatarSelector: "profile-avatar-selector",
    avatarSelectorLink: "#profile-avatar-selector-link",
    deleteButton: "#delete-button",
    doneButton: "#done-button",
    errorMessage: "#error-message",
    headerAvatar: "#header-avatar",
    moreThemesLink: "#more-themes",
    mozCard: "moz-card",
    nameInput: "#profile-name",
    savedMessage: "#saved-message",
    shortcutToggle: "#desktop-shortcut-toggle",
    themesPicker: "#themes",
  };

  updateNameDebouncer = null;
  clearSavedMessageTimer = null;

  get themeCards() {
    return this.themesPicker.childElements;
  }

  constructor() {
    super();

    this.updateNameDebouncer = new Debounce(
      () => this.updateName(),
      SAVE_NAME_TIMEOUT
    );

    this.clearSavedMessageTimer = new Debounce(
      () => this.hideSavedMessage(),
      SAVED_MESSAGE_TIMEOUT
    );
  }

  connectedCallback() {
    super.connectedCallback();

    window.addEventListener("beforeunload", this);
    window.addEventListener("pagehide", this);
    document.addEventListener("Profiles:CustomAvatarUpload", this);
    document.addEventListener("Profiles:AvatarSelected", this);

    this.init().then(() => (this.initialized = true));
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.isCopy = document.location.hash.includes("#copiedProfileName");
    let fakeParams = new URLSearchParams(
      document.location.hash.replace("#", "")
    );
    this.copiedProfileName = fakeParams.get("copiedProfileName");

    let {
      currentProfile,
      hasDesktopShortcut,
      isInAutomation,
      platform,
      profiles,
      themes,
    } = await RPMSendQuery("Profiles:GetEditProfileContent");

    if (isInAutomation) {
      this.updateNameDebouncer.timeout = 50;
    }

    this.hasDesktopShortcut = hasDesktopShortcut;
    this.platform = platform;
    this.profiles = profiles;
    this.setProfile(currentProfile);
    this.themes = themes;

    await this.setInitialInput();
  }

  async setInitialInput() {
    if (!this.isCopy) {
      return;
    }

    await this.getUpdateComplete();

    this.nameInput.value = "";
  }

  createAvatarURL() {
    if (this.profile.avatarFiles?.file16) {
      const objURL = URL.createObjectURL(this.profile.avatarFiles.file16);
      this.profile.avatarURLs.url16 = objURL;
      this.profile.avatarURLs.url80 = objURL;
    }
  }

  async getUpdateComplete() {
    const result = await super.getUpdateComplete();

    await Promise.all(
      Array.from(this.themeCards).map(card => card.updateComplete)
    );

    await this.mozCard.updateComplete;

    return result;
  }

  setProfile(newProfile) {
    if (this.profile?.hasCustomAvatar && this.profile?.avatarURLs.url16) {
      URL.revokeObjectURL(this.profile.avatarURLs.url16);
      delete this.profile.avatarURLs.url16;
      delete this.profile.avatarURLs.url80;
    }

    if (this.profile?.favicon) {
      URL.revokeObjectURL(this.profile.favicon);
    }

    this.profile = newProfile;

    if (this.profile.hasCustomAvatar) {
      this.createAvatarURL();
    }

    this.setFavicon();
  }

  setFavicon() {
    const favicon = document.getElementById("favicon");

    if (this.profile.hasCustomAvatar) {
      favicon.href = this.profile.avatarURLs.url16;
      return;
    }

    const faviconBlob = new Blob([this.profile.faviconSVGText], {
      type: "image/svg+xml",
    });
    const faviconObjURL = URL.createObjectURL(faviconBlob);
    this.profile.favicon = faviconObjURL;
    favicon.href = faviconObjURL;
  }

  handleEvent(event) {
    switch (event.type) {
      case "beforeunload": {
        let newName = this.nameInput.value.trim();
        if (newName === "") {
          this.showErrorMessage("edit-profile-page-no-name");
          event.preventDefault();
        } else {
          this.updateNameDebouncer.finalize();
        }
        break;
      }
      case "pagehide": {
        RPMSendAsyncMessage("Profiles:PageHide");
        break;
      }
      case "Profiles:CustomAvatarUpload": {
        let { file } = event.detail;
        this.updateAvatar(file);
        break;
      }
      case "Profiles:AvatarSelected": {
        let { avatar } = event.detail;
        this.updateAvatar(avatar);
        break;
      }
    }
  }

  updated() {
    super.updated();

    if (!this.profile) {
      return;
    }

    let { themeFg, themeBg } = this.profile;
    this.headerAvatar.style.fill = themeBg;
    this.headerAvatar.style.stroke = themeFg;
  }

  updateName() {
    this.updateNameDebouncer.disarm();
    this.showSavedMessage();

    let newName = this.nameInput.value.trim();
    if (!newName) {
      return;
    }

    this.profile.name = newName;
    RPMSendAsyncMessage("Profiles:UpdateProfileName", this.profile);
  }

  async updateTheme(newThemeId) {
    if (newThemeId === this.profile.themeId) {
      return;
    }

    let updatedProfile = await RPMSendQuery(
      "Profiles:UpdateProfileTheme",
      newThemeId
    );

    this.setProfile(updatedProfile);
    this.requestUpdate();
  }

  async updateAvatar(newAvatar) {
    if (newAvatar === this.profile.avatar) {
      return;
    }

    let updatedProfile = await RPMSendQuery("Profiles:UpdateProfileAvatar", {
      avatarOrFile: newAvatar,
    });

    this.setProfile(updatedProfile);
    this.requestUpdate();
  }

  isDuplicateName(newName) {
    return !!this.profiles.find(
      p => p.id !== this.profile.id && p.name === newName
    );
  }

  async handleInputEvent() {
    this.hideSavedMessage();
    let newName = this.nameInput.value.trim();
    if (newName === "") {
      this.showErrorMessage("edit-profile-page-no-name");
    } else if (this.isDuplicateName(newName)) {
      this.showErrorMessage("edit-profile-page-duplicate-name");
    } else {
      this.hideErrorMessage();
      this.updateNameDebouncer.arm();
    }
  }

  showErrorMessage(l10nId) {
    this.updateNameDebouncer.disarm();
    document.l10n.setAttributes(this.errorMessage, l10nId);
    this.errorMessage.parentElement.hidden = false;
    this.nameInput.setCustomValidity("invalid");
  }

  hideErrorMessage() {
    this.errorMessage.parentElement.hidden = true;
    this.nameInput.setCustomValidity("");
  }

  showSavedMessage() {
    this.savedMessage.parentElement.hidden = false;
    this.clearSavedMessageTimer.arm();
  }

  hideSavedMessage() {
    this.savedMessage.parentElement.hidden = true;
    this.clearSavedMessageTimer.disarm();
  }

  headerTemplate() {
    if (this.isCopy) {
      return html`<div>
        <h1
          data-l10n-id="copied-profile-page-header"
          data-l10n-args=${JSON.stringify({
            profilename: this.copiedProfileName,
          })}
        ></h1>
        <p data-l10n-id="copied-profile-page-header-description"></p>
      </div>`;
    }

    return html`<h1
      id="profile-header"
      data-l10n-id="edit-profile-page-header"
    ></h1>`;
  }

  nameInputTemplate() {
    return html`<input
      type="text"
      id="profile-name"
      size="64"
      aria-errormessage="error-message"
      .value=${this.profile.name}
      @input=${this.handleInputEvent}
    />`;
  }

  profilesNameTemplate() {
    return html`<div id="profile-name-area">
      <label
        data-l10n-id="edit-profile-page-profile-name-label"
        for="profile-name"
      ></label>
      ${this.nameInputTemplate()}
      <div class="message-parent">
        <span class="message" hidden
          ><img
            class="message-icon"
            id="error-icon"
            src="chrome://global/skin/icons/info.svg"
          />
          <span id="error-message" role="alert"></span>
        </span>
        <span class="message" hidden
          ><img
            class="message-icon"
            id="saved-icon"
            src="chrome://global/skin/icons/check-filled.svg"
          />
          <span
            id="saved-message"
            data-l10n-id="edit-profile-page-profile-saved"
          ></span>
        </span>
      </div>
    </div>`;
  }

  themesTemplate() {
    if (!this.themes) {
      return null;
    }

    return html`<moz-visual-picker
      type="listbox"
      id="themes"
      value=${this.profile.themeId}
      data-l10n-id="edit-profile-page-theme-header-2"
      headingLevel="2"
      name="theme"
      @change=${this.handleThemeChange}
    >
      ${this.themes.map(
        t =>
          html`<moz-visual-picker-item
            class="theme-item"
            l10nId=${ifDefined(t.dataL10nId)}
            name=${ifDefined(t.name)}
            value=${t.id}
          >
            <profiles-theme-card
              aria-hidden="true"
              .theme=${t}
              value=${t.id}
            ></profiles-theme-card>
          </moz-visual-picker-item>`
      )}
    </moz-visual-picker>`;
  }

  desktopShortcutTemplate() {
    if (this.platform !== "win") {
      return null;
    }

    return html`<div id="desktop-shortcut-section">
      <label
        for="desktop-shortcut-toggle"
        data-l10n-id="edit-profile-page-desktop-shortcut-header"
      ></label>
      <moz-toggle
        id="desktop-shortcut-toggle"
        data-l10n-id="edit-profile-page-desktop-shortcut-toggle"
        ?pressed=${this.hasDesktopShortcut}
        @click=${this.handleDesktopShortcutToggle}
      ></moz-toggle>
    </div>`;
  }

  async handleDesktopShortcutToggle(event) {
    event.preventDefault();
    let { hasDesktopShortcut } = await RPMSendQuery(
      "Profiles:SetDesktopShortcut",
      {
        shouldEnable: event.target.pressed,
      }
    );
    this.shortcutToggle.pressed = hasDesktopShortcut;
    this.requestUpdate();
  }

  handleThemeChange() {
    this.updateTheme(this.themesPicker.value);
  }

  headerAvatarTemplate() {
    return html`<div class="avatar-header-content">
      <img
        id="header-avatar"
        data-l10n-id=${this.profile.avatarL10nId}
        src=${this.profile.avatarURLs.url80}
      />
      <a
        id="profile-avatar-selector-link"
        tabindex="0"
        @click=${this.toggleAvatarSelectorCard}
        @keydown=${this.handleAvatarSelectorKeyDown}
        data-l10n-id="edit-profile-page-avatar-selector-opener-link"
      ></a>
      <div class="avatar-selector-parent">
        <profile-avatar-selector
          hidden
          value=${this.profile.avatar}
        ></profile-avatar-selector>
      </div>
    </div>`;
  }

  toggleAvatarSelectorCard(event) {
    event.stopPropagation();
    this.avatarSelector.toggleHidden();
  }

  handleAvatarSelectorKeyDown(event) {
    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      this.toggleAvatarSelectorCard(event);
    }
  }

  onDeleteClick() {
    window.removeEventListener("beforeunload", this);
    RPMSendAsyncMessage("Profiles:OpenDeletePage");
  }

  onDoneClick() {
    let newName = this.nameInput.value.trim();
    if (newName === "") {
      this.showErrorMessage("edit-profile-page-no-name");
    } else if (this.isDuplicateName(newName)) {
      this.showErrorMessage("edit-profile-page-duplicate-name");
    } else {
      this.updateNameDebouncer.finalize();
      // Remove the pagehide listener early to prevent double-counting the
      // profiles.existing.closed Glean event.
      window.removeEventListener("pagehide", this);
      RPMSendAsyncMessage("Profiles:CloseProfileTab");
    }
  }

  onMoreThemesClick() {
    // Include the starting URI because the page will navigate before the
    // event is asynchronously handled by Glean code in the parent actor.
    RPMSendAsyncMessage("Profiles:MoreThemes", {
      source: window.location.href,
    });
  }

  buttonsTemplate() {
    return html`<moz-button
        id="delete-button"
        data-l10n-id="edit-profile-page-delete-button"
        @click=${this.onDeleteClick}
      ></moz-button>
      <moz-button
        id="done-button"
        data-l10n-id="new-profile-page-done-button"
        @click=${this.onDoneClick}
        type="primary"
      ></moz-button>`;
  }

  render() {
    if (!this.profile) {
      return null;
    }

    return html`<link
        rel="stylesheet"
        href="chrome://browser/content/profiles/edit-profile-card.css"
      />
      <link
        rel="stylesheet"
        href="chrome://global/skin/in-content/common.css"
      />
      <moz-card
        ><div id="edit-profile-card" aria-labelledby="profile-header">
          ${this.headerAvatarTemplate()}
          <div id="profile-content">
            ${this.headerTemplate()}${this.profilesNameTemplate()}
            ${this.themesTemplate()} ${this.desktopShortcutTemplate()}

            <a
              id="more-themes"
              href="https://addons.mozilla.org/firefox/themes/"
              target="_blank"
              @click=${this.onMoreThemesClick}
              data-l10n-id="edit-profile-page-explore-themes"
            ></a>

            <moz-button-group>${this.buttonsTemplate()}</moz-button-group>
          </div>
        </div></moz-card
      >`;
  }
}

customElements.define("edit-profile-card", EditProfileCard);
