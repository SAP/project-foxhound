/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Implements doorhanger singleton that wraps up the PopupNotifications and handles
 * the doorhager UI for formautofill related features.
 */

import { FormAutofill } from "resource://autofill/FormAutofill.sys.mjs";
import { FormAutofillUtils } from "resource://gre/modules/shared/FormAutofillUtils.sys.mjs";

import { AutofillTelemetry } from "resource://gre/modules/shared/AutofillTelemetry.sys.mjs";
import { showConfirmation } from "resource://gre/modules/FillHelpers.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  CreditCard: "resource://gre/modules/CreditCard.sys.mjs",
  formAutofillStorage: "resource://autofill/FormAutofillStorage.sys.mjs",
  OSKeyStore: "resource://gre/modules/OSKeyStore.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () =>
  FormAutofill.defineLogGetter(lazy, "FormAutofillPrompter")
);

const l10n = new Localization(
  [
    "browser/preferences/formAutofill.ftl",
    "toolkit/formautofill/formAutofill.ftl",
    "branding/brand.ftl",
  ],
  true
);

const { ENABLED_AUTOFILL_CREDITCARDS_PREF } = FormAutofill;

let CONTENT = {};

/**
 * `AutofillDoorhanger` provides a base for both address capture and credit card
 * capture doorhanger notifications. It handles the UI generation and logic
 * related to displaying the doorhanger,
 *
 * The UI data sourced from the `CONTENT` variable is used for rendering. Derived classes
 * should override the `render()` method to customize the layout.
 */
export class AutofillDoorhanger {
  /**
   * Constructs an instance of the `AutofillDoorhanger` class.
   *
   * @param {object} browser   The browser where the doorhanger will be displayed.
   * @param {object} oldRecord The old record that can be merged with the new record
   * @param {object} newRecord The new record submitted by users
   */
  static headerClass = "address-capture-header";
  static descriptionClass = "address-capture-description";
  static contentClass = "address-capture-content";
  static menuButtonId = "address-capture-menu-button";

  static preferenceURL = null;
  static learnMoreURL = null;

  constructor(browser, oldRecord, newRecord, flowId) {
    this.browser = browser;
    this.oldRecord = oldRecord ?? {};
    this.newRecord = newRecord;
    this.flowId = flowId;
  }

  get ui() {
    return CONTENT[this.constructor.name];
  }

  // PopupNotification appends a "-notification" suffix to the id to avoid
  // id conflict.
  get notificationId() {
    return this.ui.id + "-notification";
  }

  // The popup notification element
  get panel() {
    return this.browser.ownerDocument.getElementById(this.notificationId);
  }

  get doc() {
    return this.browser.ownerDocument;
  }

  get chromeWin() {
    return this.browser.documentGlobal;
  }

  /*
   * An autofill doorhanger consists 3 parts - header, description, and content
   * The content part contains customized UI layout for this doorhanger
   */

  // The container of the header part
  static header(panel) {
    return panel.querySelector(`.${AutofillDoorhanger.headerClass}`);
  }
  get header() {
    return AutofillDoorhanger.header(this.panel);
  }

  // The container of the description part
  static description(panel) {
    return panel.querySelector(`.${AutofillDoorhanger.descriptionClass}`);
  }
  get description() {
    return AutofillDoorhanger.description(this.panel);
  }

  // The container of the content part
  static content(panel) {
    return panel.querySelector(`.${AutofillDoorhanger.contentClass}`);
  }
  get content() {
    return AutofillDoorhanger.content(this.panel);
  }

  static menuButton(panel) {
    return panel.querySelector(`#${AutofillDoorhanger.menuButtonId}`);
  }
  get menuButton() {
    return AutofillDoorhanger.menuButton(this.panel);
  }

  static menuPopup(panel) {
    return AutofillDoorhanger.menuButton(panel).querySelector(
      `.toolbar-menupopup`
    );
  }
  get menuPopup() {
    return AutofillDoorhanger.menuPopup(this.panel);
  }

  static preferenceButton(panel) {
    return AutofillDoorhanger.menuButton(panel).querySelector(
      `[data-l10n-id=address-capture-manage-address-button]`
    );
  }
  static learnMoreButton(panel) {
    return AutofillDoorhanger.menuButton(panel).querySelector(
      `[data-l10n-id=address-capture-learn-more-button]`
    );
  }

  get preferenceURL() {
    return this.constructor.preferenceURL;
  }
  get learnMoreURL() {
    return this.constructor.learnMoreURL;
  }

  onMenuItemClick(evt) {
    AutofillTelemetry.recordDoorhangerClicked(
      this.constructor.telemetryType,
      evt,
      this.constructor.telemetryObject,
      this.flowId
    );

    if (evt == "open-pref") {
      this.browser.documentGlobal.openPreferences(this.preferenceURL);
    } else if (evt == "learn-more") {
      const url =
        Services.urlFormatter.formatURLPref("app.support.baseURL") +
        this.learnMoreURL;
      this.browser.documentGlobal.openWebLinkIn(url, "tab", {
        relatedToCurrent: true,
      });
    }
  }

  // Build the doorhanger markup
  render() {
    this.renderHeader();

    this.renderDescription();

    // doorhanger specific content
    this.renderContent();
  }

  renderHeader() {
    // Render the header text
    const text = this.header.querySelector(`h1`);
    this.doc.l10n.setAttributes(text, this.ui.header.l10nId);

    // Render the menu button
    if (!this.ui.menu?.length || AutofillDoorhanger.menuButton(this.panel)) {
      return;
    }

    const button = this.doc.createElement("moz-button");
    button.setAttribute("id", AutofillDoorhanger.menuButtonId);
    button.setAttribute("type", "icon ghost");
    button.setAttribute(
      "iconsrc",
      "chrome://browser/skin/formautofill/icon-doorhanger-menu.svg"
    );
    this.doc.l10n.setAttributes(button, "address-capture-open-menu-button");

    const menupopup = this.doc.createXULElement("menupopup");
    menupopup.setAttribute("id", AutofillDoorhanger.menuButtonId);
    menupopup.setAttribute("class", "toolbar-menupopup");

    for (const [index, element] of this.ui.menu.entries()) {
      const menuitem = this.doc.createXULElement("menuitem");
      this.doc.l10n.setAttributes(menuitem, element.l10nId);
      /* eslint-disable mozilla/balanced-listeners */
      menuitem.addEventListener("command", event => {
        event.stopPropagation();
        this.onMenuItemClick(element.evt);
      });
      menupopup.appendChild(menuitem);

      if (index != this.ui.menu.length - 1) {
        menupopup.appendChild(this.doc.createXULElement("menuseparator"));
      }
    }

    button.appendChild(menupopup);
    /* eslint-disable mozilla/balanced-listeners */
    button.addEventListener("click", event => {
      event.stopPropagation();
      menupopup.openPopup(button, "after_start");
    });
    this.header.appendChild(button);
  }

  renderDescription() {
    if (this.ui.description?.l10nId) {
      const text = this.description.querySelector(`p`);
      this.doc.l10n.setAttributes(text, this.ui.description.l10nId);
      this.description?.setAttribute("style", "");
    } else {
      this.description?.setAttribute("style", "display:none");
    }
  }

  onEventCallback(state) {
    lazy.log.debug(`Doorhanger receives event callback: ${state}`);

    if (state == "showing") {
      this.render();
    }
  }

  async show() {
    AutofillTelemetry.recordDoorhangerShown(
      this.constructor.telemetryType,
      this.constructor.telemetryObject,
      this.flowId
    );

    let options = {
      ...this.ui.options,
      eventCallback: state => this.onEventCallback(state),
    };

    this.#setAnchor();

    return new Promise(resolve => {
      this.resolve = resolve;
      this.chromeWin.PopupNotifications.show(
        this.browser,
        this.ui.id,
        this.getNotificationHeader?.() ?? "",
        this.ui.anchor.id,
        ...this.#createActions(),
        options
      );
    });
  }

  /**
   * Closes the doorhanger with a given action.
   * This method is specifically intended for closing the doorhanger in scenarios
   * other than clicking the main or secondary buttons.
   */
  closeDoorhanger(action) {
    this.resolve(action);
    const notification = this.chromeWin.PopupNotifications.getNotification(
      this.ui.id,
      this.browser
    );
    if (notification) {
      this.chromeWin.PopupNotifications.remove(notification);
    }
  }

  /**
   * Create an image element for notification anchor if it doesn't already exist.
   */
  #setAnchor() {
    let anchor = this.doc.getElementById(this.ui.anchor.id);
    if (!anchor) {
      // Icon shown on URL bar
      anchor = this.doc.createXULElement("image");
      anchor.id = this.ui.anchor.id;
      anchor.setAttribute("src", this.ui.anchor.URL);
      anchor.classList.add("notification-anchor-icon");
      anchor.setAttribute("role", "button");
      anchor.setAttribute("tooltiptext", this.ui.anchor.tooltiptext);

      const popupBox = this.doc.getElementById("notification-popup-box");
      popupBox.appendChild(anchor);
    }
  }

  /**
   * Generate the main action and secondary actions from content parameters and
   * promise resolve.
   */
  #createActions() {
    function getLabelAndAccessKey(param) {
      const msg = l10n.formatMessagesSync([{ id: param.l10nId }])[0];
      return {
        label: msg.attributes.find(x => x.name == "label").value,
        accessKey: msg.attributes.find(x => x.name == "accessKey").value,
        dismiss: param.dismiss,
      };
    }

    const mainActionParams = this.ui.footer.mainAction;
    const secondaryActionParams = this.ui.footer.secondaryActions;

    const callback = () => {
      AutofillTelemetry.recordDoorhangerClicked(
        this.constructor.telemetryType,
        mainActionParams.callbackState,
        this.constructor.telemetryObject,
        this.flowId
      );

      this.resolve(mainActionParams.callbackState);
    };

    const mainAction = {
      ...getLabelAndAccessKey(mainActionParams),
      callback,
    };

    let secondaryActions = [];
    for (const params of secondaryActionParams) {
      secondaryActions.push({
        ...getLabelAndAccessKey(params),
        callback: () => {
          AutofillTelemetry.recordDoorhangerClicked(
            this.constructor.telemetryType,
            params.callbackState,
            this.constructor.telemetryObject,
            this.flowId
          );

          this.resolve(params.callbackState);
        },
      });
    }

    return [mainAction, secondaryActions];
  }
}

export class AddressSaveDoorhanger extends AutofillDoorhanger {
  static preferenceURL = "privacy-address-autofill";
  static learnMoreURL = "automatically-fill-your-address-web-forms";
  static editLinkId = "address-capture-edit-address-button";

  static telemetryType = AutofillTelemetry.ADDRESS;
  static telemetryObject = "capture_doorhanger";

  constructor(browser, oldRecord, newRecord, flowId) {
    super(browser, oldRecord, newRecord, flowId);
  }

  /**
   * Formats a line by comparing the old and the new address field and returns an array of
   * <span> elements that represents the formatted line.
   *
   * @param {Array<Array<string>>} datalist An array of pairs, where each pair contains old and new data.
   * @param {boolean}              showDiff True to format the text line that highlight the diff part.
   *
   * @returns {Array<HTMLSpanElement>} An array of formatted text elements.
   */
  #formatLine(datalist, showDiff) {
    const createSpan = (text, style = null) => {
      let s;

      if (showDiff) {
        if (style == "remove") {
          s = this.doc.createElement("del");
          s.setAttribute("class", "address-update-text-diff-removed");
        } else if (style == "add") {
          s = this.doc.createElement("mark");
          s.setAttribute("class", "address-update-text-diff-added");
        } else {
          s = this.doc.createElement("span");
        }
      } else {
        s = this.doc.createElement("span");
      }
      s.textContent = text;
      return s;
    };

    let spans = [];
    let previousField;
    for (const [field, oldData, newData] of datalist) {
      if (!oldData && !newData) {
        continue;
      }

      // Always add a whitespace between field data that we put in the same line.
      // Ex. first-name: John, family-name: Doe becomes
      // "John Doe"
      if (spans.length) {
        if (previousField == "address-level2" && field == "address-level1") {
          spans.push(createSpan(", "));
        } else {
          spans.push(createSpan(" "));
        }
      }

      if (!oldData) {
        spans.push(createSpan(newData, "add"));
      } else if (!newData || oldData == newData) {
        // The same
        spans.push(createSpan(oldData));
      } else if (newData.startsWith(oldData)) {
        // Have the same prefix
        const diff = newData.slice(oldData.length).trim();
        spans.push(createSpan(newData.slice(0, newData.length - diff.length)));
        spans.push(createSpan(diff, "add"));
      } else if (newData.endsWith(oldData)) {
        // Have the same suffix
        const diff = newData.slice(0, newData.length - oldData.length).trim();
        spans.push(createSpan(diff, "add"));
        spans.push(createSpan(newData.slice(diff.length)));
      } else {
        spans.push(createSpan(oldData, "remove"));
        spans.push(createSpan(" "));
        spans.push(createSpan(newData, "add"));
      }

      previousField = field;
    }

    return spans;
  }

  #formatTextByAddressCategory(fieldName) {
    let data = [];
    switch (fieldName) {
      case "street-address":
        data = [
          [
            fieldName,
            FormAutofillUtils.toOneLineAddress(
              this.oldRecord["street-address"]
            ),
            FormAutofillUtils.toOneLineAddress(
              this.newRecord["street-address"]
            ),
          ],
        ];
        break;
      case "address":
        data = [
          [
            "address-level2",
            this.oldRecord["address-level2"],
            this.newRecord["address-level2"],
          ],
          [
            "address-level1",
            FormAutofillUtils.getAbbreviatedSubregionName(
              this.oldRecord["address-level1"],
              this.oldRecord.country
            ) || this.oldRecord["address-level1"],
            FormAutofillUtils.getAbbreviatedSubregionName(
              this.newRecord["address-level1"],
              this.newRecord.country
            ) || this.newRecord["address-level1"],
          ],
          [
            "postal-code",
            this.oldRecord["postal-code"],
            this.newRecord["postal-code"],
          ],
        ];
        break;
      case "name":
      case "country":
      case "tel":
      case "email":
      case "organization":
        data = [
          [fieldName, this.oldRecord[fieldName], this.newRecord[fieldName]],
        ];
        break;
    }

    const showDiff = !!Object.keys(this.oldRecord).length;
    return this.#formatLine(data, showDiff);
  }

  renderDescription() {
    if (lazy.formAutofillStorage.addresses.isEmpty()) {
      super.renderDescription();
    } else {
      this.description?.setAttribute("style", "display:none");
    }
  }

  renderContent() {
    this.content.replaceChildren();

    // Each section contains address fields that are grouped together while displaying
    // the doorhanger.
    for (const { imgClass, categories } of this.ui.content.sections) {
      // Add all the address fields that are in the same category
      let texts = [];
      categories.forEach(category => {
        const line = this.#formatTextByAddressCategory(category);
        if (line.length) {
          texts.push(line);
        }
      });

      // If there is no data for this section, just ignore it.
      if (!texts.length) {
        continue;
      }

      const section = this.doc.createElement("div");
      section.setAttribute("class", "address-save-update-row-container");

      // Add image icon for this section
      //const img = this.doc.createElement("img");
      const img = this.doc.createXULElement("image");
      img.setAttribute("class", imgClass);
      // ToDo: provide meaningful alt values (bug 1870155):
      img.setAttribute("alt", "");
      section.appendChild(img);

      // Each line is consisted of multiple <span> to form diff style texts
      const lineContainer = this.doc.createElement("div");
      for (const spans of texts) {
        const p = this.doc.createElement("p");
        spans.forEach(span => p.appendChild(span));
        lineContainer.appendChild(p);
      }
      section.appendChild(lineContainer);

      this.content.appendChild(section);
    }

    const link = this.doc.createXULElement("label", { is: "text-link" });
    link.setAttribute("id", AddressSaveDoorhanger.editLinkId);
    link.setAttribute("tabindex", "0");
    link.setAttribute("role", "link");
    this.doc.l10n.setAttributes(link, "address-capture-edit-address-link");
    /* eslint-disable mozilla/balanced-listeners */
    link.addEventListener("click", () => {
      this.closeDoorhanger("edit-address");
    });
    const linkContainer = this.doc.createXULElement("hbox");
    linkContainer.className = "address-capture-edit-link-container";
    linkContainer.appendChild(link);
    this.content.appendChild(linkContainer);
  }

  // The record to be saved by this doorhanger
  recordToSave() {
    return this.newRecord;
  }
}

/**
 * Address Update doorhanger and Address Save doorhanger have the same implementation.
 * The only difference is UI.
 */
export class AddressUpdateDoorhanger extends AddressSaveDoorhanger {
  static telemetryObject = "update_doorhanger";
}

export class AddressEditDoorhanger extends AutofillDoorhanger {
  static telemetryType = AutofillTelemetry.ADDRESS;
  static telemetryObject = "edit_doorhanger";

  constructor(browser, record, flowId) {
    // Address edit dialog doesn't have "old" record
    super(browser, null, record, flowId);

    this.country = record.country || FormAutofill.DEFAULT_REGION;
  }

  // Address edit doorhanger changes layout according to the country
  #layout = null;
  get layout() {
    if (this.#layout?.country != this.country) {
      this.#layout = FormAutofillUtils.getFormFormat(this.country);
    }
    return this.#layout;
  }

  get country() {
    return this.newRecord.country;
  }

  set country(c) {
    if (this.newRecord.country == c) {
      return;
    }

    // `recordToSave` only contains the latest data the current country support.
    // For example, if a country doesn't have `address-level2`, `recordToSave`
    // will not have the address field.
    // `newRecord` is where we keep all the data regardless what the country is.
    // Merge `recordToSave` to `newRecord` before switching country to keep
    // `newRecord` update-to-date.
    this.newRecord = Object.assign(this.newRecord, this.recordToSave());

    // The layout of the address edit doorhanger should be changed when the
    // country is changed.
    this.#buildCountrySpecificAddressFields();

    // Replace country-specific fixed fields in-place to update their labels and options.
    for (const fieldId of ["address-level1", "postal-code"]) {
      const oldInput = this.panel.querySelector(
        `#${AddressEditDoorhanger.getInputId(fieldId)}`
      );
      if (oldInput) {
        oldInput.replaceWith(this.#createInputField(fieldId));
      }
    }
  }

  renderContent() {
    this.content.replaceChildren();
    this.#buildAddressFields(this.content, this.ui.content.fixedRowsBefore);
    this.#buildCountrySpecificAddressFields();
    this.#buildAddressFields(this.content, this.ui.content.fixedRowsAfter);
  }

  #buildAddressFields(container, rows) {
    for (const row of rows) {
      const rowDiv = this.doc.createElement("div");
      rowDiv.setAttribute("class", "address-edit-row-container");
      container.appendChild(rowDiv);
      for (const fieldId of row) {
        rowDiv.appendChild(this.#createInputField(fieldId));
      }
    }
  }

  #buildCountrySpecificAddressFields() {
    const allFixedFieldIds = [
      ...this.ui.content.fixedRowsBefore.flat(),
      ...this.ui.content.fixedRowsAfter.flat(),
      "street-address",
    ];

    let container = this.doc.getElementById(
      "country-specific-fields-container"
    );
    if (container) {
      container.replaceChildren();
    } else {
      container = this.doc.createElement("div");
      container.setAttribute("id", "country-specific-fields-container");
      const insertIndex = this.ui.content.fixedRowsBefore.length;
      this.content.insertBefore(container, this.content.children[insertIndex]);
    }

    const countrySpecificFields = this.layout.fieldsOrder.filter(
      f => !allFixedFieldIds.includes(f.fieldId)
    );

    const rows = [];
    let currentRow = [];
    for (const { fieldId, newLine } of countrySpecificFields) {
      currentRow.push(fieldId);
      if (newLine) {
        rows.push(currentRow);
        currentRow = [];
      }
    }
    if (currentRow.length) {
      rows.push(currentRow);
    }

    this.#buildAddressFields(container, rows);
  }

  #createInputField(fieldName) {
    let labelL10nId;
    switch (fieldName) {
      case "address-level1":
        labelL10nId = this.layout.addressLevel1L10nId;
        break;
      case "address-level2":
        labelL10nId = this.layout.addressLevel2L10nId;
        break;
      case "address-level3":
        labelL10nId = this.layout.addressLevel3L10nId;
        break;
      case "postal-code":
        labelL10nId = this.layout.postalCodeL10nId;
        break;
      case "street-address":
        labelL10nId = "autofill-address-street-address";
        break;
      case "country":
        // workaround because `autofill-address-country` is already defined
        labelL10nId = "autofill-address-country-only";
        break;
      default:
        labelL10nId = `autofill-address-${fieldName}`;
        break;
    }

    const labelText = labelL10nId
      ? (l10n.formatValueSync(labelL10nId) ?? "")
      : "";
    const inputId = AddressEditDoorhanger.getInputId(fieldName);

    let input;
    if (fieldName === "country") {
      input = this.doc.createElement("moz-select");
      input.setAttribute("label", labelText);
      input.setAttribute("id", inputId);

      const emptyOpt = this.doc.createElement("moz-option");
      emptyOpt.setAttribute("value", "");
      emptyOpt.setAttribute("label", "");
      input.appendChild(emptyOpt);

      const countries = [...FormAutofill.countries.entries()].sort((e1, e2) =>
        e1[1].localeCompare(e2[1])
      );
      for (const [countryCode] of countries) {
        const countryName = Services.intl.getRegionDisplayNames(undefined, [
          countryCode.toLowerCase(),
        ]);
        const opt = this.doc.createElement("moz-option");
        opt.setAttribute("value", countryCode);
        opt.setAttribute("label", countryName);
        input.appendChild(opt);
      }

      input.value = this.newRecord.country ?? "";
      /* eslint-disable mozilla/balanced-listeners */
      input.addEventListener("change", event => {
        event.stopPropagation();
        this.country = input.value;
      });
    } else if (
      fieldName === "address-level1" &&
      this.layout.addressLevel1Options
    ) {
      input = this.doc.createElement("moz-select");
      input.setAttribute("label", labelText);
      input.setAttribute("id", inputId);

      const emptyOpt = this.doc.createElement("moz-option");
      emptyOpt.setAttribute("value", "");
      emptyOpt.setAttribute("label", "");
      input.appendChild(emptyOpt);

      const optionData = [];
      for (const [regionCode, regionName] of this.layout.addressLevel1Options) {
        const opt = this.doc.createElement("moz-option");
        opt.setAttribute("label", regionCode);
        opt.setAttribute("value", regionName);
        input.appendChild(opt);
        optionData.push({ text: regionCode, value: regionName });
      }

      const matched = FormAutofillUtils.findAddressSelectOption(
        optionData,
        this.newRecord,
        "address-level1",
        this.newRecord["address-level1"]
      );
      input.value = matched?.value ?? "";
    } else if (fieldName === "street-address") {
      input = this.doc.createElement("moz-textarea");
      input.setAttribute("label", labelText);
      input.setAttribute("id", inputId);
      input.rows = 3;
      input.value = this.newRecord["street-address"] ?? "";
    } else {
      input = this.doc.createElement("moz-input-text");
      input.setAttribute("label", labelText);
      input.setAttribute("id", inputId);
      input.value = this.newRecord[fieldName] ?? "";
    }

    return input;
  }

  /**
   * This method generates a unique input ID using the field name of the address field.
   *
   * @param {string} fieldName The name of the address field
   */
  static getInputId(fieldName) {
    return `address-edit-${fieldName}-input`;
  }

  /*
   * Return a regular expression that matches the ID pattern generated by getInputId.
   */
  static #getInputIdMatchRegexp() {
    const regex = /^address-edit-(.+)-input$/;
    return regex;
  }

  /**
   * Collects data from all visible address field inputs within the doorhanger.
   * Since address fields may vary by country, only fields present for the
   * current country's address format are included in the record.
   */
  recordToSave() {
    let record = {};
    const regex = AddressEditDoorhanger.#getInputIdMatchRegexp();
    const elements = this.panel.querySelectorAll(
      "moz-input-text, moz-textarea, moz-select"
    );
    for (const element of elements) {
      const match = element.id.match(regex);
      if (match && match[1]) {
        record[match[1]] = element.value;
      }
    }
    return record;
  }

  onEventCallback(state) {
    super.onEventCallback(state);

    // Close the edit address doorhanger when it has been dismissed.
    if (state == "dismissed") {
      this.closeDoorhanger("cancel");
    }
  }
}

export class CreditCardSaveDoorhanger extends AutofillDoorhanger {
  static contentClass = "credit-card-capture-content";

  static telemetryType = AutofillTelemetry.CREDIT_CARD;
  static telemetryObject = "capture_doorhanger";

  static spotlightURL = "about:preferences#privacy-credit-card-autofill";

  constructor(browser, oldRecord, newRecord, flowId) {
    super(browser, oldRecord, newRecord, flowId);
  }

  /**
   * We have not yet sync address and credit card design. After syncing,
   * we should be able to use the same "class"
   */
  static content(panel) {
    return panel.querySelector(`.${CreditCardSaveDoorhanger.contentClass}`);
  }
  get content() {
    return CreditCardSaveDoorhanger.content(this.panel);
  }

  addCheckboxListener() {
    if (!this.ui.options.checkbox) {
      return;
    }

    const { checkbox } = this.panel;
    if (checkbox && !checkbox.hidden) {
      checkbox.addEventListener("command", event => {
        let { secondaryButton, menubutton } =
          event.target.closest("popupnotification");
        let checked = event.target.checked;
        Services.prefs.setBoolPref("services.sync.engine.creditcards", checked);
        secondaryButton.disabled = checked;
        menubutton.disabled = checked;
        lazy.log.debug("Set creditCard sync to", checked);
      });
    }
  }

  removeCheckboxListener() {
    if (!this.ui.options.checkbox) {
      return;
    }

    const { checkbox } = this.panel;

    if (checkbox && !checkbox.hidden) {
      checkbox.removeEventListener(
        "command",
        this.ui.options.checkbox.callback
      );
    }
  }

  appendDescription() {
    const docFragment = this.doc.createDocumentFragment();

    const label = this.doc.createXULElement("label");
    this.doc.l10n.setAttributes(label, this.ui.description.l10nId);
    docFragment.appendChild(label);

    const descriptionWrapper = this.doc.createXULElement("hbox");
    descriptionWrapper.className = "desc-message-box";

    const number =
      this.newRecord["cc-number"] || this.newRecord["cc-number-decrypted"];
    const name = this.newRecord["cc-name"];
    const network = lazy.CreditCard.getType(number);

    const descriptionIcon = lazy.CreditCard.getCreditCardLogo(network);
    if (descriptionIcon) {
      const icon = this.doc.createXULElement("image");
      if (
        typeof descriptionIcon == "string" &&
        (descriptionIcon.includes("cc-logo") ||
          descriptionIcon.includes("icon-credit"))
      ) {
        icon.setAttribute("src", descriptionIcon);
        icon.className = "cc-icon";
      }
      descriptionWrapper.appendChild(icon);
    }

    const description = this.doc.createXULElement("description");
    description.className = "payments-doorhanger-description";
    const lineOne = this.doc.createElement("div");
    lineOne.className = "line-one";
    const lineTwo = this.doc.createElement("div");
    lineTwo.className = "line-two";

    lineOne.textContent = lazy.CreditCard.getMaskedNumber(number);
    lineTwo.textContent = name || "";

    description.appendChild(lineOne);
    description.appendChild(lineTwo);
    description.appendChild(this.createPrivacyPanelLink());
    descriptionWrapper.appendChild(description);
    docFragment.appendChild(descriptionWrapper);

    this.content.appendChild(docFragment);
  }

  createPrivacyPanelLink() {
    const privacyLinkElement = this.doc.createXULElement("label", {
      is: "text-link",
    });
    privacyLinkElement.setAttribute("useoriginprincipal", true);
    privacyLinkElement.setAttribute(
      "href",
      CreditCardSaveDoorhanger.spotlightURL ||
        "about:preferences#privacy-payment-methods-autofill"
    );

    this.doc.l10n.setAttributes(privacyLinkElement, "autofill-options-link");

    return privacyLinkElement;
  }

  // TODO: Currently, the header and description are unused. Align
  // these with the address doorhanger's implementation during
  // the credit card doorhanger redesign.
  getNotificationHeader() {
    return l10n.formatValueSync(this.ui.header.l10nId);
  }

  renderHeader() {
    // Not implement
  }

  renderDescription() {
    // Not implement
  }

  renderContent() {
    this.content.replaceChildren();

    this.appendDescription();
  }

  onEventCallback(state) {
    super.onEventCallback(state);

    if (state == "removed" || state == "dismissed") {
      this.removeCheckboxListener();
    } else if (state == "shown") {
      this.addCheckboxListener();
    }
  }

  // The record to be saved by this doorhanger
  recordToSave() {
    return this.newRecord;
  }
}

export class CreditCardUpdateDoorhanger extends CreditCardSaveDoorhanger {
  static telemetryType = AutofillTelemetry.CREDIT_CARD;
  static telemetryObject = "update_doorhanger";

  constructor(browser, oldRecord, newRecord, flowId) {
    super(browser, oldRecord, newRecord, flowId);
  }
}

CONTENT = {
  [AddressSaveDoorhanger.name]: {
    id: "address-save-update",
    anchor: {
      id: "autofill-address-notification-icon",
      URL: "chrome://formautofill/content/formfill-anchor.svg",
      tooltiptext: l10n.formatValueSync("autofill-message-tooltip"),
    },
    header: {
      l10nId: "address-capture-save-doorhanger-header",
    },
    description: {
      l10nId: "address-capture-save-doorhanger-description",
    },
    menu: [
      {
        l10nId: "address-capture-manage-address-button",
        evt: "open-pref",
      },
      {
        l10nId: "address-capture-learn-more-button",
        evt: "learn-more",
      },
    ],
    content: {
      // We divide address data into two sections to display in the Address Save Doorhanger.
      sections: [
        {
          imgClass: "address-capture-img-address",
          categories: [
            "name",
            "organization",
            "street-address",
            "address",
            "country",
          ],
        },
        {
          imgClass: "address-capture-img-email",
          categories: ["email", "tel"],
        },
      ],
    },
    footer: {
      mainAction: {
        l10nId: "address-capture-save-button",
        callbackState: "create",
      },
      secondaryActions: [
        {
          l10nId: "address-capture-not-now-button",
          callbackState: "cancel",
        },
      ],
    },
    options: {
      autofocus: true,
      persistWhileVisible: true,
      hideClose: true,
    },
  },

  [AddressUpdateDoorhanger.name]: {
    id: "address-save-update",
    anchor: {
      id: "autofill-address-notification-icon",
      URL: "chrome://formautofill/content/formfill-anchor.svg",
      tooltiptext: l10n.formatValueSync("autofill-message-tooltip"),
    },
    header: {
      l10nId: "address-capture-update-doorhanger-header",
    },
    menu: [
      {
        l10nId: "address-capture-manage-address-button",
        evt: "open-pref",
      },
      {
        l10nId: "address-capture-learn-more-button",
        evt: "learn-more",
      },
    ],
    content: {
      // Addresses fields are categoried into two sections, each section
      // has its own icon
      sections: [
        {
          imgClass: "address-capture-img-address",
          categories: [
            "name",
            "organization",
            "street-address",
            "address",
            "country",
          ],
        },
        {
          imgClass: "address-capture-img-email",
          categories: ["email", "tel"],
        },
      ],
    },
    footer: {
      mainAction: {
        l10nId: "address-capture-update-button",
        callbackState: "update",
      },
      secondaryActions: [
        {
          l10nId: "address-capture-not-now-button",
          callbackState: "cancel",
        },
      ],
    },
    options: {
      autofocus: true,
      persistWhileVisible: true,
      hideClose: true,
    },
  },

  [AddressEditDoorhanger.name]: {
    id: "address-edit",
    anchor: {
      id: "autofill-address-notification-icon",
      URL: "chrome://formautofill/content/formfill-anchor.svg",
      tooltiptext: l10n.formatValueSync("autofill-message-tooltip"),
    },
    header: {
      l10nId: "address-capture-edit-doorhanger-header",
    },
    menu: null,
    content: {
      fixedRowsBefore: [["name"], ["organization"], ["street-address"]],
      fixedRowsAfter: [
        ["address-level1", "country"],
        ["postal-code", "tel"],
        ["email"],
      ],
    },
    footer: {
      mainAction: {
        l10nId: "address-capture-save-button",
        callbackState: "save",
      },
      secondaryActions: [
        {
          l10nId: "address-capture-cancel-button",
          callbackState: "cancel",
          dismiss: true,
        },
      ],
    },
    options: {
      autofocus: true,
      persistWhileVisible: true,
      hideClose: true,
    },
  },

  [CreditCardSaveDoorhanger.name]: {
    id: "credit-card-save-update",
    anchor: {
      id: "autofill-credit-card-notification-icon",
      URL: "chrome://formautofill/content/formfill-anchor.svg",
      tooltiptext: l10n.formatValueSync("autofill-message-tooltip"),
    },
    header: {
      l10nId: "credit-card-save-doorhanger-header",
    },
    description: {
      l10nId: "credit-card-save-doorhanger-description",
    },
    content: {},
    footer: {
      mainAction: {
        l10nId: "credit-card-capture-save-button",
        callbackState: "create",
      },
      secondaryActions: [
        {
          l10nId: "credit-card-capture-cancel-button",
          callbackState: "cancel",
        },
        {
          l10nId: "credit-card-capture-never-save-button",
          callbackState: "disable",
        },
      ],
    },
    options: {
      persistWhileVisible: true,
      hideClose: true,

      checkbox: {
        get checked() {
          return Services.prefs.getBoolPref("services.sync.engine.creditcards");
        },
        get label() {
          // Only set the label when the fallowing conditions existed:
          // - sync account is set
          // - credit card sync is disabled
          // - credit card sync is available
          // otherwise return null label to hide checkbox.
          return Services.prefs.prefHasUserValue("services.sync.username") &&
            !Services.prefs.getBoolPref("services.sync.engine.creditcards") &&
            Services.prefs.getBoolPref(
              "services.sync.engine.creditcards.available"
            )
            ? l10n.formatValueSync(
                "credit-card-doorhanger-credit-cards-sync-checkbox"
              )
            : null;
        },
      },
    },
  },

  [CreditCardUpdateDoorhanger.name]: {
    id: "credit-card-save-update",
    anchor: {
      id: "autofill-credit-card-notification-icon",
      URL: "chrome://formautofill/content/formfill-anchor.svg",
      tooltiptext: l10n.formatValueSync("autofill-message-tooltip"),
    },
    header: {
      l10nId: "credit-card-update-doorhanger-header",
    },
    description: {
      l10nId: "credit-card-update-doorhanger-description",
    },
    content: {},
    footer: {
      mainAction: {
        l10nId: "credit-card-capture-update-button",
        callbackState: "update",
      },
      secondaryActions: [
        {
          l10nId: "credit-card-capture-save-new-button",
          callbackState: "create",
        },
      ],
    },
    options: {
      persistWhileVisible: true,
      hideClose: true,
    },
  },
};

export let FormAutofillPrompter = {
  async promptToSaveCreditCard(
    browser,
    storage,
    flowId,
    { oldRecord, newRecord }
  ) {
    if (!browser) {
      return;
    }

    const showUpdateDoorhanger = !!Object.keys(oldRecord).length;

    lazy.log.debug(
      `Show the ${
        showUpdateDoorhanger ? "update" : "save"
      } credit card doorhanger`
    );

    const { documentGlobal: win } = browser;
    win.MozXULElement.insertFTLIfNeeded(
      "toolkit/formautofill/formAutofill.ftl"
    );

    let action;
    const doorhanger = showUpdateDoorhanger
      ? new CreditCardUpdateDoorhanger(browser, oldRecord, newRecord, flowId)
      : new CreditCardSaveDoorhanger(browser, oldRecord, newRecord, flowId);
    action = await doorhanger.show();

    lazy.log.debug(`Doorhanger action is ${action}`);

    if (action == "cancel") {
      return;
    } else if (action == "disable") {
      Services.prefs.setBoolPref(ENABLED_AUTOFILL_CREDITCARDS_PREF, false);
      return;
    }

    if (!(await lazy.OSKeyStore.ensureLoggedIn(false)).authenticated) {
      lazy.log.warn("User canceled encryption login");
      return;
    }

    this._updateStorageAfterInteractWithPrompt(
      browser,
      storage,
      "credit-card",
      action == "update" ? oldRecord : null,
      doorhanger.recordToSave()
    );
  },

  /**
   * Show save or update address doorhanger
   *
   * @param {Element<browser>} browser  Browser to show the save/update address prompt
   * @param {object} storage Address storage
   * @param {string} flowId Unique GUID to record a series of the same user action
   * @param {object} options
   * @param {object} [options.oldRecord] Record to be merged
   * @param {object} [options.newRecord] Record with more information
   */
  async promptToSaveAddress(
    browser,
    storage,
    flowId,
    { oldRecord, newRecord }
  ) {
    if (!browser) {
      return;
    }

    const showUpdateDoorhanger = !!Object.keys(oldRecord).length;

    lazy.log.debug(
      `Show the ${showUpdateDoorhanger ? "update" : "save"} address doorhanger`
    );

    const { documentGlobal: win } = browser;
    win.MozXULElement.insertFTLIfNeeded(
      "toolkit/formautofill/formAutofill.ftl"
    );
    // address-autofill-* are defined in browser/preferences now
    win.MozXULElement.insertFTLIfNeeded("browser/preferences/formAutofill.ftl");

    let doorhanger;
    let action;
    while (true) {
      doorhanger = showUpdateDoorhanger
        ? new AddressUpdateDoorhanger(browser, oldRecord, newRecord, flowId)
        : new AddressSaveDoorhanger(browser, oldRecord, newRecord, flowId);
      action = await doorhanger.show();

      if (action == "edit-address") {
        doorhanger = new AddressEditDoorhanger(
          browser,
          { ...oldRecord, ...newRecord },
          flowId
        );
        action = await doorhanger.show();

        // If users cancel the edit address doorhanger, show the save/update
        // doorhanger again.
        if (action == "cancel") {
          continue;
        }
      }

      break;
    }

    lazy.log.debug(`Doorhanger action is ${action}`);

    if (action == "cancel") {
      return;
    }

    this._updateStorageAfterInteractWithPrompt(
      browser,
      storage,
      "address",
      showUpdateDoorhanger ? oldRecord : null,
      doorhanger.recordToSave()
    );
  },

  // TODO: Simplify the code after integrating credit card prompt to use AutofillDoorhanger
  async _updateStorageAfterInteractWithPrompt(
    browser,
    storage,
    type,
    oldRecord,
    newRecord
  ) {
    let changedGUID = null;
    if (oldRecord) {
      changedGUID = oldRecord.guid;
      await storage.update(changedGUID, newRecord, true);
    } else {
      changedGUID = await storage.add(newRecord);
    }
    storage.notifyUsed(changedGUID);

    const messageIdMap = {
      "credit-card": {
        created: "confirmation-hint-credit-card-created",
        updated: "confirmation-hint-credit-card-updated",
      },
      address: {
        created: "confirmation-hint-address-created",
        updated: "confirmation-hint-address-updated",
      },
    };
    showConfirmation(
      browser,
      messageIdMap[type][oldRecord ? "updated" : "created"]
    );
  },
};
