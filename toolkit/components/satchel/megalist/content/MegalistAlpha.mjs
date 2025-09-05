/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, when } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  // eslint-disable-next-line mozilla/no-browser-refs-in-toolkit
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
});

// Directly import moz-button here, otherwise, moz-button will be loaded and upgraded on DOMContentLoaded, after MegalistAlpha is first updated.
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/megalist/components/password-card/password-card.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/megalist/components/login-form/login-form.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/megalist/components/notification-message-bar/notification-message-bar.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/sidebar/sidebar-panel-header.mjs";

const DISPLAY_MODES = {
  ALERTS: "DisplayAlerts",
  ALL: "DisplayAll",
};

const VIEW_MODES = {
  LIST: "List",
  ADD: "Add",
  EDIT: "Edit",
  ALERTS: "Alerts",
};

const INPUT_CHANGE_DELAY = 300;

export class MegalistAlpha extends MozLitElement {
  constructor() {
    super();
    this.searchText = "";
    this.records = [];
    this.header = null;
    this.notification = null;
    this.reauthResolver = null;
    this.displayMode = DISPLAY_MODES.ALL;
    this.inputChangeTimeout = null;
    this.viewMode = VIEW_MODES.LIST;
    this.selectedRecord = null;

    window.addEventListener("MessageFromViewModel", ev =>
      this.#onMessageFromViewModel(ev)
    );
    window.addEventListener("SidebarWillHide", ev =>
      this.#onSidebarWillHide(ev)
    );
  }

  static get properties() {
    return {
      selectedRecord: { type: Object },
      searchText: { type: String },
      records: { type: Array },
      header: { type: Object },
      notification: { type: Object },
      displayMode: { type: String },
      viewMode: { type: String },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.#messageToViewModel("Refresh");
    this.#sendCommand("UpdateDisplayMode", { value: this.displayMode });
  }

  async getUpdateComplete() {
    await super.getUpdateComplete();
    const passwordCards = Array.from(
      this.shadowRoot.querySelectorAll("password-card")
    );
    await Promise.all(passwordCards.map(el => el.updateComplete));
  }

  #onPasswordRevealClick(concealed, lineIndex) {
    if (concealed) {
      this.#messageToViewModel("Command", {
        commandId: "Reveal",
        snapshotId: lineIndex,
      });
    } else {
      this.#messageToViewModel("Command", {
        commandId: "Conceal",
        snapshotId: lineIndex,
      });
    }
  }

  #onMessageFromViewModel({ detail }) {
    const functionName = `receive${detail.name}`;
    if (!(functionName in this)) {
      console.warn(`Received unknown message "${detail.name}"`);
    }
    this[functionName]?.(detail.data);
  }

  #onInputChange(e) {
    const searchText = e.target.value;
    this.searchText = searchText;
    this.viewMode = VIEW_MODES.LIST;
    this.selectedRecord = null;

    this.#debounce(
      () => this.#messageToViewModel("UpdateFilter", { searchText }),
      INPUT_CHANGE_DELAY
    )();
  }

  #onAddButtonClick(trigger) {
    this.viewMode = VIEW_MODES.ADD;
    this.#recordToolbarAction("add_new", trigger);
  }

  #onRadioButtonChange(e) {
    this.displayMode = e.target.value;
    this.#sendCommand("UpdateDisplayMode", { value: this.displayMode });

    let gleanAction =
      this.displayMode === DISPLAY_MODES.ALL
        ? "list_state_all"
        : "list_state_alerts";
    this.#recordToolbarAction(gleanAction, "toolbar");
  }

  #onCancelLoginForm() {
    switch (this.viewMode) {
      case VIEW_MODES.EDIT:
        this.#sendCommand("DiscardChanges", {
          value: { passwordIndex: this.selectedRecord.password.lineIndex },
        });
        return;
      default:
        this.viewMode = VIEW_MODES.LIST;
    }
  }

  #openMenu(e) {
    const panelList = this.shadowRoot.querySelector("panel-list");
    const menuButton = this.shadowRoot.querySelector(
      "#more-options-menubutton"
    );
    menuButton.setAttribute("aria-expanded", "true");

    panelList.addEventListener(
      "hidden",
      () => menuButton.setAttribute("aria-expanded", "false"),
      { once: true }
    );

    panelList.toggle(e);
  }

  #recordToolbarAction(action, trigger = "") {
    Glean.contextualManager.toolbarAction.record({
      trigger,
      option_name: action,
    });
  }

  #recordNotificationShown(id) {
    const gleanNotificationString = id.replaceAll("-", "_");
    Glean.contextualManager.notificationShown.record({
      notification_detail: gleanNotificationString,
    });
  }

  #messageToViewModel(messageName, data) {
    window.windowGlobalChild
      .getActor("Megalist")
      .sendAsyncMessage(messageName, data);
  }

  #sendCommand(commandId, options = {}, snapshotId = 0) {
    // TODO(Bug 1913302): snapshotId should be optional for global commands.
    // Right now, we always pass 0 and overwrite when needed.
    this.#messageToViewModel("Command", {
      commandId,
      snapshotId,
      ...options,
    });
  }

  receiveShowSnapshots({ snapshots }) {
    const [header, records] = this.#createLoginRecords(snapshots);
    this.header = header;
    this.records = records;
  }

  receiveSnapshot({ snapshotId, snapshot }) {
    const recordIndex = Math.floor((snapshotId - 1) / 3);
    const field = snapshot.field;
    this.records[recordIndex][field] = snapshot;
    this.requestUpdate();
  }

  receiveSetNotification(notification) {
    this.#recordNotificationShown(notification.id);
    this.notification = notification;
    this.viewMode = notification.viewMode ?? this.viewMode;
  }

  receiveSetDisplayMode(displayMode) {
    if (this.displayMode !== displayMode) {
      this.displayMode = displayMode;
      const radioBtnId =
        displayMode === DISPLAY_MODES.ALL ? "allLogins" : "alerts";
      this.shadowRoot.querySelector(`#${radioBtnId}`).checked = true;
    }
  }

  receiveReauthResponse(isAuthorized) {
    this.reauthResolver?.(isAuthorized);
  }

  receiveDiscardChangesConfirmed() {
    this.viewMode = VIEW_MODES.LIST;
    this.selectedRecord = null;
    this.notification = null;
  }

  reauthCommandHandler(commandFn) {
    return new Promise((resolve, _reject) => {
      this.reauthResolver = resolve;
      commandFn();
    });
  }

  #createLoginRecords(snapshots) {
    const header = snapshots.shift();
    const records = [];

    for (let i = 0; i < snapshots.length; i += 3) {
      records.push({
        origin: snapshots[i],
        username: snapshots[i + 1],
        password: snapshots[i + 2],
      });
    }

    return [header, records];
  }

  #debounce(callback, delay) {
    return () => {
      clearTimeout(this.inputChangeTimeout);
      this.inputChangeTimeout = setTimeout(() => {
        callback();
      }, delay);
    };
  }

  #onSidebarWillHide(e) {
    // Prevent hiding the sidebar if a password is being edited and show a
    // message asking to confirm if the user wants to discard their changes.
    const shouldShowDiscardChangesPrompt =
      this.viewMode === VIEW_MODES.EDIT &&
      (!this.notification || this.notification?.id === "discard-changes") &&
      !this.notification?.fromSidebar;

    if (shouldShowDiscardChangesPrompt) {
      const passwordIndex = this.selectedRecord.password.lineIndex;
      this.#sendCommand("DiscardChanges", {
        value: { fromSidebar: true, passwordIndex },
      });
      e.preventDefault();
    }
  }

  // TODO: This should be passed to virtualized list with an explicit height.
  renderListItem({ origin: displayOrigin, username, password }, index) {
    return html` <password-card
      @keypress=${e => {
        if (e.shiftKey && e.key === "Tab") {
          e.preventDefault();
          this.shadowRoot.querySelector(".passwords-list").focus();
        } else if (e.key === "Tab") {
          e.preventDefault();
          const webContent =
            lazy.BrowserWindowTracker.getTopWindow().gBrowser.selectedTab
              .linkedBrowser;
          webContent.focus();
        }
      }}
      role="group"
      aria-label=${displayOrigin.value}
      .origin=${displayOrigin}
      .username=${username}
      .password=${password}
      .messageToViewModel=${this.#messageToViewModel.bind(this)}
      .reauthCommandHandler=${commandFn => this.reauthCommandHandler(commandFn)}
      .onPasswordRevealClick=${(concealed, lineIndex) =>
        this.#onPasswordRevealClick(concealed, lineIndex)}
      .handleEditButtonClick=${() => {
        this.viewMode = VIEW_MODES.EDIT;
        this.selectedRecord = this.records[index];
      }}
      .handleViewAlertClick=${() => {
        this.viewMode = VIEW_MODES.ALERTS;
        this.selectedRecord = this.records[index];
      }}
    >
    </password-card>`;
  }

  // TODO: Temporary. Should be rendered by the virtualized list.
  renderList() {
    return this.records.length
      ? html`
          <div
            class="passwords-list"
            role="listbox"
            tabindex="0"
            data-l10n-id="passwords-list-label"
            @keypress=${e => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                this.shadowRoot
                  .querySelector("password-card")
                  .originLine.focus();
              }
            }}
          >
            ${this.records.map((record, index) =>
              this.renderListItem(record, index)
            )}
          </div>
        `
      : this.renderEmptyState();
  }

  renderAlertsList() {
    const { origin, username, password } = this.selectedRecord;
    const alerts = [
      {
        displayAlert: origin.breached,
        notification: origin.breachedNotification,
      },
      {
        displayAlert: !username.value.length,
        notification: username.noUsernameNotification,
      },
      {
        displayAlert: password.vulnerable,
        notification: password.vulnerableNotification,
      },
    ];

    const handleButtonClick = async () => {
      const isAuthenticated = await this.reauthCommandHandler(() =>
        this.#messageToViewModel("Command", {
          commandId: "Edit",
          snapshotId: this.selectedRecord.password.lineIndex,
        })
      );

      if (!isAuthenticated) {
        return;
      }

      this.viewMode = VIEW_MODES.EDIT;
    };

    return html`
      <moz-card class="alert-card" data-l10n-id="passwords-alert-card">
        <moz-button
          type="icon ghost"
          iconSrc="chrome://browser/skin/back.svg"
          data-l10n-id="passwords-alert-back-button"
          @click=${() => (this.viewMode = VIEW_MODES.LIST)}
        >
        </moz-button>
        <ul data-l10n-id="passwords-alert-list">
          ${alerts.map(({ displayAlert, notification }) =>
            when(
              displayAlert,
              () => {
                this.#recordNotificationShown(notification.id);
                return html`
                  <li>
                    <notification-message-bar
                      exportparts="support-link"
                      .notification=${{
                        ...notification,
                        onButtonClick: handleButtonClick,
                      }}
                      .messageHandler=${(commandId, options) =>
                        this.#sendCommand(commandId, options)}
                    >
                    </notification-message-bar>
                  </li>
                `;
              },
              () => ""
            )
          )}
        </ul>
      </moz-card>
    `;
  }

  renderEmptyState() {
    if (this.header) {
      const { total, count } = this.header.value;
      if (!total) {
        return this.renderNoLoginsCard();
      } else if (!count) {
        return this.renderEmptySearchResults();
      }
    }

    return "";
  }

  renderNoLoginsCard() {
    return html`
      <moz-card class="empty-state-card">
        <div class="no-logins-card-content">
          <img
            src="chrome://global/content/megalist/icons/cpm-fox-illustration.svg"
            role="presentation"
            alt=""
          />
          <strong
            class="no-logins-card-heading"
            data-l10n-id="passwords-no-passwords-header"
          ></strong>
          <p data-l10n-id="passwords-no-passwords-message"></p>
          <p data-l10n-id="passwords-no-passwords-get-started-message"></p>
          <div class="no-logins-card-buttons">
            <moz-button
              class="empty-state-import-from-browser"
              data-l10n-id="passwords-command-import-from-browser"
              type="primary"
              @click=${() => {
                this.#sendCommand("ImportFromBrowser");
                this.#recordToolbarAction("import_browser", "empty_state_card");
              }}
            ></moz-button>
            <moz-button
              class="empty-state-import-from-file"
              data-l10n-id="passwords-command-import"
              @click=${() => {
                this.#sendCommand("Import");
                this.#recordToolbarAction("import_file", "empty_state_card");
              }}
            ></moz-button>
            <moz-button
              class="empty-state-add-password"
              data-l10n-id="passwords-add-manually"
              @click=${() => this.#onAddButtonClick("empty_state_card")}
            ></moz-button>
          </div>
        </div>
      </moz-card>
    `;
  }

  renderEmptySearchResults() {
    return html` <moz-card
      class="empty-state-card"
      data-l10n-id="passwords-no-passwords-found-header"
    >
      <div
        id="no-results-message"
        class="empty-search-results"
        data-l10n-id="passwords-no-passwords-found-message"
      ></div>
    </moz-card>`;
  }

  renderLastRow() {
    switch (this.viewMode) {
      case VIEW_MODES.LIST:
        return this.renderList();
      case VIEW_MODES.ADD:
        return html` <login-form
          .onClose=${() => this.#onCancelLoginForm()}
          .onSaveClick=${loginForm => {
            this.#sendCommand("AddLogin", { value: loginForm });
          }}
        >
        </login-form>`;
      case VIEW_MODES.EDIT:
        return html` <login-form
          type="edit"
          originValue=${this.selectedRecord.origin.href}
          usernameValue=${this.selectedRecord.username.value}
          ?passwordVisible=${!this.selectedRecord.password.concealed}
          .passwordValue=${this.selectedRecord.password.value}
          .onPasswordRevealClick=${() =>
            this.#onPasswordRevealClick(
              this.selectedRecord.password.concealed,
              this.selectedRecord.password.lineIndex
            )}
          .onClose=${() => this.#onCancelLoginForm()}
          .onSaveClick=${loginForm => {
            loginForm.guid = this.selectedRecord.origin.guid;
            this.#sendCommand("UpdateLogin", {
              value: loginForm,
            });
            this.#sendCommand(
              "Cancel",
              {},
              this.selectedRecord.password.lineIndex
            );
          }}
          }}
          .onDeleteClick=${() => {
            const login = {
              origin: this.selectedRecord.origin,
              guid: this.selectedRecord.origin.guid,
            };
            this.#sendCommand("DeleteLogin", { value: login });
          }}
          .onOriginClick=${e => {
            e.preventDefault();
            this.#sendCommand("OpenLink", {
              value: this.selectedRecord.origin.href,
            });
          }}
        >
        </login-form>`;
      case VIEW_MODES.ALERTS:
        return this.renderAlertsList();
      default:
        return "";
    }
  }

  renderSearch() {
    const hasResults = this.records.length;
    const describedBy = hasResults ? "" : "no-results-message";
    return html`
      <div
        class="search-container"
        @click=${() => {
          this.shadowRoot.querySelector(".search").focus();
        }}
      >
        <div class="search-icon"></div>
        <input
          class="search"
          type="search"
          data-l10n-id="filter-input"
          .value=${this.searchText}
          aria-describedby=${describedBy}
          @input=${e => this.#onInputChange(e)}
        />
      </div>
    `;
  }

  renderFirstRow() {
    return html`<div class="first-row">
      ${this.renderSearch()} ${this.renderMenu()}
    </div>`;
  }

  renderRadioButtons() {
    return html`
      <div data-l10n-id="passwords-radiogroup-label" role="radiogroup">
        <input
          @change=${this.#onRadioButtonChange}
          checked
          type="radio"
          id="allLogins"
          name="logins"
          value=${DISPLAY_MODES.ALL}
        />
        <label
          for="allLogins"
          data-l10n-id="passwords-radiobutton-all"
          data-l10n-args=${JSON.stringify({ total: this.header.value.total })}
        ></label>

        <input
          @change=${this.#onRadioButtonChange}
          type="radio"
          id="alerts"
          name="logins"
          value=${DISPLAY_MODES.ALERTS}
        />
        <label
          for="alerts"
          data-l10n-id="passwords-radiobutton-alerts"
          data-l10n-args=${JSON.stringify({ total: this.header.value.alerts })}
        ></label>
      </div>
    `;
  }

  renderMenu() {
    return html`
      <moz-button
        @click=${this.#openMenu}
        type="icon ghost"
        iconSrc="chrome://global/skin/icons/more.svg"
        aria-expanded="false"
        aria-haspopup="menu"
        data-l10n-id="menu-more-options-button"
        id="more-options-menubutton"
      ></moz-button>
      <panel-list
        role="menu"
        aria-labelledby="more-options-menubutton"
        data-l10n-id="more-options-popup"
      >
        <panel-item
          action="add-password"
          data-l10n-id="passwords-command-create"
          @click=${() => this.#onAddButtonClick("toolbar")}
        ></panel-item>
        <panel-item
          action="import-from-browser"
          data-l10n-id="passwords-command-import-from-browser"
          @click=${() => {
            this.#sendCommand("ImportFromBrowser");
            this.#recordToolbarAction("import_browser", "toolbar");
          }}
        ></panel-item>
        <panel-item
          action="import-from-file"
          data-l10n-id="passwords-command-import"
          @click=${() => {
            this.#sendCommand("Import");
            this.#recordToolbarAction("import_file", "toolbar");
          }}
        ></panel-item>
        <panel-item
          action="export-logins"
          data-l10n-id="passwords-command-export"
          @click=${() => {
            this.#sendCommand("Export");
            this.#recordToolbarAction("export", "toolbar");
          }}
        ></panel-item>
        <panel-item
          action="remove-all-logins"
          data-l10n-id="passwords-command-remove-all"
          @click=${() => {
            this.#sendCommand("RemoveAll");
            this.#recordToolbarAction("remove_all", "toolbar");
          }}
          ?disabled=${!this.header?.value.total}
        ></panel-item>
        <hr />
        <panel-item
          action="open-preferences"
          data-l10n-id="passwords-command-settings"
          @click=${() => {
            const command = this.header.commands.find(
              command => command.id === "Settings"
            );
            this.#sendCommand("OpenLink", { value: command.url });
            this.#recordToolbarAction("preferences", "toolbar");
          }}
        ></panel-item>
        <panel-item
          action="open-help"
          data-l10n-id="passwords-command-help"
          @click=${() => {
            const command = this.header.commands.find(
              command => command.id === "Help"
            );
            this.#sendCommand("OpenLink", { value: command.url });
            this.#recordToolbarAction("help", "toolbar");
          }}
        ></panel-item>
      </panel-list>
    `;
  }

  renderSecondRow() {
    if (!this.header) {
      return "";
    }

    return html`<div class="second-row">${this.renderRadioButtons()}</div>`;
  }

  async #scrollPasswordCardIntoView(guid) {
    const matchingRecordIndex = this.records.findIndex(
      record => record.origin.guid === guid
    );
    this.viewMode = VIEW_MODES.LIST;
    await this.getUpdateComplete();
    const passwordCard =
      this.shadowRoot.querySelectorAll("password-card")[matchingRecordIndex];
    passwordCard.scrollIntoView({ block: "center" });
    passwordCard.originLine.focus();
  }

  renderNotification() {
    if (!this.notification) {
      return "";
    }

    return html`
      <notification-message-bar
        exportparts="support-link"
        .notification=${this.notification}
        .onDismiss=${() => {
          this.notification = null;
        }}
        .messageHandler=${(commandId, options, snapshotId) =>
          this.#sendCommand(commandId, options, snapshotId)}
        @view-login=${e => this.#scrollPasswordCardIntoView(e.detail.guid)}
      >
      </notification-message-bar>
    `;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/content/megalist/megalist.css"
      />
      <div class="container">
        <sidebar-panel-header
          data-l10n-id="sidebar-menu-cpm-header"
          data-l10n-attrs="heading"
          view="viewCPMSidebar"
        ></sidebar-panel-header>
        ${this.renderFirstRow()} ${this.renderSecondRow()}
        ${this.renderNotification()} ${this.renderLastRow()}
      </div>
    `;
  }
}

customElements.define("megalist-alpha", MegalistAlpha);
