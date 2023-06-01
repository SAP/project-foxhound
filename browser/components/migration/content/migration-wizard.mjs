/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button-group.mjs";
import { MigrationWizardConstants } from "chrome://browser/content/migration/migration-wizard-constants.mjs";

/**
 * This component contains the UI that steps users through migrating their
 * data from other browsers to this one. This component only contains very
 * basic logic and structure for the UI, and most of the state management
 * occurs in the MigrationWizardChild JSWindowActor.
 */
export class MigrationWizard extends HTMLElement {
  static #template = null;

  #deck = null;
  #browserProfileSelector = null;
  #resourceTypeList = null;
  #shadowRoot = null;
  #importButton = null;

  static get markup() {
    return `
      <template>
        <link rel="stylesheet" href="chrome://browser/skin/migration/migration-wizard.css">
        <named-deck id="wizard-deck" selected-view="page-selection" aria-live="polite">

          <div name="page-selection">
            <h3 data-l10n-id="migration-wizard-selection-header"></h3>
            <select id="browser-profile-selector">
            </select>
            <details class="resource-selection-details" open="true">
              <summary>
                <div data-l10n-id="migration-all-available-data-label"></div>
                <div data-l10n-id="migration-available-data-label"></div>
                <span class="dropdown-icon" role="img"></span>
              </summary>
              <fieldset id="resource-type-list">
                <label id="select-all">
                  <input type="checkbox" class="select-all-checkbox"/><span data-l10n-id="migration-select-all-option-label"></span>
                </label>
                <label id="bookmarks" data-resource-type="BOOKMARKS"/>
                  <input type="checkbox"/><span data-l10n-id="migration-bookmarks-option-label"></span>
                </label>
                <label id="logins-and-passwords" data-resource-type="PASSWORDS">
                  <input type="checkbox"/><span data-l10n-id="migration-logins-and-passwords-option-label"></span>
                </label>
                <label id="history" data-resource-type="HISTORY">
                  <input type="checkbox"/><span data-l10n-id="migration-history-option-label"></span>
                </label>
                <label id="form-autofill" data-resource-type="FORMDATA">
                  <input type="checkbox"/><span data-l10n-id="migration-form-autofill-option-label"></span>
                </label>
              </fieldset>
            </details>

            <moz-button-group class="buttons">
              <button class="cancel-close" data-l10n-id="migration-cancel-button-label"></button>
              <button id="import" class="primary" data-l10n-id="migration-import-button-label"></button>
            </moz-button-group>
          </div>

          <div name="page-progress">
            <h3 id="progress-header" data-l10n-id="migration-wizard-progress-header"></h3>
            <div class="resource-progress">
              <div data-resource-type="BOOKMARKS" class="resource-progress-group">
                <span class="progress-icon-parent"><span class="progress-icon" role="img"></span></span>
                <span data-l10n-id="migration-bookmarks-option-label"></span>
                <span class="success-text">&nbsp;</span>
              </div>

              <div data-resource-type="PASSWORDS" class="resource-progress-group">
                <span class="progress-icon-parent"><span class="progress-icon" role="img"></span></span>
                <span data-l10n-id="migration-logins-and-passwords-option-label"></span>
                <span class="success-text">&nbsp;</span>
              </div>

              <div data-resource-type="HISTORY" class="resource-progress-group">
                <span class="progress-icon-parent"><span class="progress-icon" role="img"></span></span>
                <span data-l10n-id="migration-history-option-label"></span>
                <span class="success-text">&nbsp;</span>
              </div>

              <div data-resource-type="FORMDATA" class="resource-progress-group">
                <span class="progress-icon-parent"><span class="progress-icon" role="img"></span></span>
                <span data-l10n-id="migration-form-autofill-option-label"></span>
                <span class="success-text">&nbsp;</span>
              </div>
            </div>
          </div>

          <div name="page-safari-permission">
            <h3>TODO: Safari permission page</h3>
          </div>
        </named-deck>
      </template>
    `;
  }

  static get fragment() {
    if (!MigrationWizard.#template) {
      let parser = new DOMParser();
      let doc = parser.parseFromString(MigrationWizard.markup, "text/html");
      MigrationWizard.#template = document.importNode(
        doc.querySelector("template"),
        true
      );
    }
    let fragment = MigrationWizard.#template.content.cloneNode(true);
    if (window.IS_STORYBOOK) {
      // If we're using Storybook, load the CSS from the static local file
      // system rather than chrome:// to take advantage of auto-reloading.
      fragment.querySelector("link[rel=stylesheet]").href =
        "./migration/migration-wizard.css";
    }
    return fragment;
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "closed" });

    if (window.MozXULElement) {
      window.MozXULElement.insertFTLIfNeeded(
        "locales-preview/migrationWizard.ftl"
      );
    }
    document.l10n.connectRoot(shadow);

    shadow.appendChild(MigrationWizard.fragment);

    this.#deck = shadow.querySelector("#wizard-deck");
    this.#browserProfileSelector = shadow.querySelector(
      "#browser-profile-selector"
    );

    let cancelCloseButtons = shadow.querySelectorAll(".cancel-close");
    for (let button of cancelCloseButtons) {
      button.addEventListener("click", this);
    }

    this.#importButton = shadow.querySelector("#import");
    this.#importButton.addEventListener("click", this);

    this.#browserProfileSelector.addEventListener("change", this);
    this.#resourceTypeList = shadow.querySelector("#resource-type-list");

    let selectAllCheckbox = shadow.querySelector("#select-all").control;
    selectAllCheckbox.addEventListener("change", this);

    this.#shadowRoot = shadow;
  }

  connectedCallback() {
    this.dispatchEvent(
      new CustomEvent("MigrationWizard:Init", { bubbles: true })
    );
  }

  /**
   * This is the main entrypoint for updating the state and appearance of
   * the wizard.
   *
   * @param {object} state The state to be represented by the component.
   * @param {string} state.page The page of the wizard to display. This should
   *   be one of the MigrationWizardConstants.PAGES constants.
   */
  setState(state) {
    switch (state.page) {
      case MigrationWizardConstants.PAGES.SELECTION: {
        this.#onShowingSelection(state);
        break;
      }
      case MigrationWizardConstants.PAGES.PROGRESS: {
        this.#onShowingProgress(state);
        break;
      }
    }

    this.#deck.setAttribute("selected-view", `page-${state.page}`);

    if (window.IS_STORYBOOK) {
      this.#updateForStorybook();
    }
  }

  /**
   * Reacts to changes to the browser / profile selector dropdown. This
   * should update the list of resource types to match what's supported
   * by the selected migrator and profile.
   */
  #onBrowserProfileSelectionChanged() {
    let resourceTypes = this.#browserProfileSelector.selectedOptions[0]
      .resourceTypes;
    for (let child of this.#resourceTypeList.children) {
      child.hidden = true;
    }

    for (let resourceType of resourceTypes) {
      let resourceLabel = this.#resourceTypeList.querySelector(
        `label[data-resource-type="${resourceType}"]`
      );
      if (resourceLabel) {
        resourceLabel.hidden = false;
      }
    }
  }

  /**
   * Called when showing the browser/profile selection page of the wizard.
   *
   * @param {object} state
   *   The state object passed into setState. The following properties are
   *   used:
   * @param {string[]} state.migrators An array of source browser names that
   *   can be migrated from.
   */
  #onShowingSelection(state) {
    this.#browserProfileSelector.textContent = "";

    let selectionPage = this.#shadowRoot.querySelector(
      "div[name='page-selection']"
    );
    selectionPage.toggleAttribute("show-import-all", state.showImportAll);

    for (let migrator of state.migrators) {
      let opt = document.createElement("option");
      opt.value = migrator.key;
      opt.profile = migrator.profile;
      opt.resourceTypes = migrator.resourceTypes;

      if (migrator.profile) {
        document.l10n.setAttributes(
          opt,
          "migration-wizard-selection-option-with-profile",
          {
            sourceBrowser: migrator.displayName,
            profileName: migrator.profile.name,
          }
        );
      } else {
        document.l10n.setAttributes(
          opt,
          "migration-wizard-selection-option-without-profile",
          {
            sourceBrowser: migrator.displayName,
          }
        );
      }

      this.#browserProfileSelector.appendChild(opt);
    }

    if (state.migrators.length) {
      this.#onBrowserProfileSelectionChanged();
    }
  }

  /**
   * @typedef {object} ProgressState
   *   The migration progress state for a resource.
   * @property {boolean} inProgress
   *   True if progress is still underway.
   * @property {string} [message=undefined]
   *   An optional message to display underneath the resource in
   *   the progress dialog. This message is only shown when inProgress
   *   is `false`.
   */

  /**
   * Called when showing the progress / success page of the wizard.
   *
   * @param {object} state
   *   The state object passed into setState. The following properties are
   *   used:
   * @param {Object<string, ProgressState>} state.progress
   *   An object whose keys match one of DISPLAYED_RESOURCE_TYPES.
   *
   *   Any resource type not included in state.progress will be hidden.
   */
  #onShowingProgress(state) {
    // Any resource progress group not included in state.progress is hidden.
    let resourceGroups = this.#shadowRoot.querySelectorAll(
      ".resource-progress-group"
    );
    let totalProgressGroups = Object.keys(state.progress).length;
    let remainingProgressGroups = totalProgressGroups;

    for (let group of resourceGroups) {
      let resourceType = group.dataset.resourceType;
      if (!state.progress.hasOwnProperty(resourceType)) {
        group.hidden = true;
        continue;
      }
      group.hidden = false;

      let progressIcon = group.querySelector(".progress-icon");
      let successText = group.querySelector(".success-text");

      if (state.progress[resourceType].inProgress) {
        document.l10n.setAttributes(
          progressIcon,
          "migration-wizard-progress-icon-in-progress"
        );
        progressIcon.classList.remove("completed");
        // With no status text, we re-insert the &nbsp; so that the status
        // text area does not fully collapse.
        successText.appendChild(document.createTextNode("\u00A0"));
      } else {
        document.l10n.setAttributes(
          progressIcon,
          "migration-wizard-progress-icon-completed"
        );
        progressIcon.classList.add("completed");
        successText.textContent = state.progress[resourceType].message;
        remainingProgressGroups--;
      }
    }

    let headerL10nID =
      remainingProgressGroups > 0
        ? "migration-wizard-progress-header"
        : "migration-wizard-progress-done-header";
    let header = this.#shadowRoot.getElementById("progress-header");
    document.l10n.setAttributes(header, headerL10nID);
  }

  /**
   * Certain parts of the MigrationWizard need to be modified slightly
   * in order to work properly with Storybook. This method should be called
   * to apply those changes after changing state.
   */
  #updateForStorybook() {
    // The CSS mask used for the progress spinner cannot be loaded via
    // chrome:// URIs in Storybook. We work around this by exposing the
    // progress elements as custom parts that the MigrationWizard story
    // can style on its own.
    this.#shadowRoot.querySelectorAll(".progress-icon").forEach(progressEl => {
      if (progressEl.classList.contains("completed")) {
        progressEl.removeAttribute("part");
      } else {
        progressEl.setAttribute("part", "progress-spinner");
      }
    });
  }

  /**
   * Takes the current state of the selections page and bundles them
   * up into a MigrationWizard:BeginMigration event that can be handled
   * externally to perform the actual migration.
   */
  #doImport() {
    let option = this.#browserProfileSelector.options[
      this.#browserProfileSelector.selectedIndex
    ];
    let key = option.value;
    let profile = option.profile;
    let resourceTypeFields = this.#resourceTypeList.querySelectorAll(
      "label[data-resource-type]"
    );
    let resourceTypes = [];
    for (let resourceTypeField of resourceTypeFields) {
      if (resourceTypeField.control.checked) {
        resourceTypes.push(resourceTypeField.dataset.resourceType);
      }
    }

    this.dispatchEvent(
      new CustomEvent("MigrationWizard:BeginMigration", {
        bubbles: true,
        detail: {
          key,
          profile,
          resourceTypes,
        },
      })
    );
  }

  handleEvent(event) {
    switch (event.type) {
      case "click": {
        if (event.target == this.#importButton) {
          this.#doImport();
        } else if (event.target.classList.contains("cancel-close")) {
          this.dispatchEvent(
            new CustomEvent("MigrationWizard:Close", { bubbles: true })
          );
        }
        break;
      }
      case "change": {
        if (event.target == this.#browserProfileSelector) {
          this.#onBrowserProfileSelectionChanged();
        } else if (event.target.classList.contains("select-all-checkbox")) {
          let checkboxes = this.#shadowRoot.querySelectorAll(
            'label[data-resource-type] > input[type="checkbox"]'
          );
          for (let checkbox of checkboxes) {
            checkbox.checked = event.target.checked;
          }
        }
        break;
      }
    }
  }
}

if (globalThis.customElements) {
  customElements.define("migration-wizard", MigrationWizard);
}
