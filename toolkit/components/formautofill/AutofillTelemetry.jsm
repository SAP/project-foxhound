/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["AutofillTelemetry", "AddressTelemetry"];

const { FormAutofillUtils } = ChromeUtils.import(
  "resource://autofill/FormAutofillUtils.jsm"
);
const { FormAutofillCreditCardSection } = ChromeUtils.import(
  "resource://autofill/FormAutofillHandler.jsm"
);

const { FIELD_STATES } = FormAutofillUtils;

class AutofillTelemetryBase {
  SUPPORTED_FIELDS = {};

  EVENT_CATEGORY = null;
  EVENT_OBJECT_FORM_INTERACTION = null;

  SCALAR_DETECTED_SECTION_COUNT = null;
  SCALAR_SUBMITTED_SECTION_COUNT = null;
  SCALAR_AUTOFILL_PROFILE_COUNT = null;

  HISTOGRAM_NUM_USES = null;
  HISTOGRAM_PROFILE_NUM_USES = null;
  HISTOGRAM_PROFILE_NUM_USES_KEY = null;

  #initFormEventExtra(value) {
    let extra = {};
    for (const field of Object.values(this.SUPPORTED_FIELDS)) {
      extra[field] = value;
    }
    return extra;
  }

  #setFormEventExtra(extra, key, value) {
    if (!this.SUPPORTED_FIELDS[key]) {
      return;
    }

    extra[this.SUPPORTED_FIELDS[key]] = value;
  }

  recordFormDetected(section) {
    let extra = this.#initFormEventExtra("false");
    let identified = new Set();
    section.fieldDetails.forEach(detail => {
      identified.add(detail.fieldName);

      if (detail._reason == "autocomplete") {
        this.#setFormEventExtra(extra, detail.fieldName, "true");
      } else {
        // confidence exists only when a field is identified by fathom.
        let confidence =
          detail.confidence > 0 ? Math.floor(100 * detail.confidence) / 100 : 0;
        this.#setFormEventExtra(extra, detail.fieldName, confidence.toString());
      }
    });

    this.recordFormEvent("detected", section.flowId, extra);
  }

  recordPopupShown(section, fieldName) {
    const extra = { field_name: fieldName };
    this.recordFormEvent("popup_shown", section.flowId, extra);
  }

  recordFormFilled(section, profile) {
    // Calculate values for telemetry
    let extra = this.#initFormEventExtra("unavailable");

    for (let fieldDetail of section.fieldDetails) {
      let element = fieldDetail.elementWeakRef.get();
      let state = profile[fieldDetail.fieldName] ? "filled" : "not_filled";
      if (
        fieldDetail.state == FIELD_STATES.NORMAL &&
        (HTMLSelectElement.isInstance(element) ||
          (HTMLInputElement.isInstance(element) && element.value.length))
      ) {
        state = "user_filled";
      }
      this.#setFormEventExtra(extra, fieldDetail.fieldName, state);
    }

    this.recordFormEvent("filled", section.flowId, extra);
  }

  recordFilledModified(section, fieldName) {
    const extra = { field_name: fieldName };
    this.recordFormEvent("filled_modified", section.flowId, extra);
  }

  recordFormSubmitted(section, record, form) {
    let extra = this.#initFormEventExtra("unavailable");

    if (record.guid !== null) {
      // If the `guid` is not null, it means we're editing an existing record.
      // In that case, all fields in the record are autofilled, and fields in
      // `untouchedFields` are unmodified.
      for (const [fieldName, value] of Object.entries(record.record)) {
        if (record.untouchedFields?.includes(fieldName)) {
          this.#setFormEventExtra(extra, fieldName, "autofilled");
        } else if (value) {
          this.#setFormEventExtra(extra, fieldName, "user_filled");
        } else {
          this.#setFormEventExtra(extra, fieldName, "not_filled");
        }
      }
    } else {
      Object.keys(record.record).forEach(fieldName =>
        this.#setFormEventExtra(extra, fieldName, "user_filled")
      );
    }

    this.recordFormEvent("submitted", section.flowId, extra);
  }

  recordFormCleared(section, fieldName) {
    const extra = { field_name: fieldName };

    // Note that when a form is cleared, we also record `filled_modified` events
    // for all the fields that have been cleared.
    this.recordFormEvent("cleared", section.flowId, extra);
  }

  recordFormEvent(method, flowId, extra) {
    Services.telemetry.recordEvent(
      this.EVENT_CATEGORY,
      method,
      this.EVENT_OBJECT_FORM_INTERACTION,
      flowId,
      extra
    );
  }

  recordFormInteractionEvent(
    method,
    section,
    { fieldName, profile, record, form } = {}
  ) {
    if (!this.EVENT_OBJECT_FORM_INTERACTION) {
      return undefined;
    }
    switch (method) {
      case "detected":
        return this.recordFormDetected(section);
      case "popup_shown":
        return this.recordPopupShown(section, fieldName);
      case "filled":
        return this.recordFormFilled(section, profile);
      case "filled_modified":
        return this.recordFilledModified(section, fieldName);
      case "submitted":
        return this.recordFormSubmitted(section, record, form);
      case "cleared":
        return this.recordFormCleared(section, fieldName);
    }
    return undefined;
  }

  recordDoorhangerEvent(method, record) {
    Services.telemetry.recordEvent(
      this.EVENT_CATEGORY,
      method,
      record.guid ? "update_doorhanger" : "capture_doorhanger",
      record.flowId
    );
  }

  recordManageEvent(method, object) {
    Services.telemetry.recordEvent(this.EVENT_CATEGORY, method, object);
  }

  recordAutofillProfileCount(count) {
    if (!this.SCALAR_AUTOFILL_PROFILE_COUNT) {
      return;
    }

    Services.telemetry.scalarSet(this.SCALAR_AUTOFILL_PROFILE_COUNT, count);
  }

  recordDetectedSectionCount() {
    if (!this.SCALAR_DETECTED_SECTION_COUNT) {
      return;
    }

    Services.telemetry.scalarAdd(this.SCALAR_DETECTED_SECTION_COUNT, 1);
  }

  recordSubmittedSectionCount(count) {
    if (!this.SCALAR_SUBMITTED_SECTION_COUNT || !count) {
      return;
    }

    Services.telemetry.scalarAdd(this.SCALAR_SUBMITTED_SECTION_COUNT, count);
  }

  recordNumberOfUse(records) {
    let histogram = Services.telemetry.getKeyedHistogramById(
      this.HISTOGRAM_PROFILE_NUM_USES
    );
    histogram.clear();

    for (let record of records) {
      histogram.add(this.HISTOGRAM_PROFILE_NUM_USES_KEY, record.timesUsed);
    }
  }
}

class AddressTelemetry extends AutofillTelemetryBase {
  EVENT_CATEGORY = "address";
  EVENT_OBJECT_FORM_INTERACTION = "address_form";
  EVENT_OBJECT_FORM_INTERACTION_EXT = "address_form_ext";

  SCALAR_DETECTED_SECTION_COUNT =
    "formautofill.addresses.detected_sections_count";
  SCALAR_SUBMITTED_SECTION_COUNT =
    "formautofill.addresses.submitted_sections_count";
  SCALAR_AUTOFILL_PROFILE_COUNT =
    "formautofill.addresses.autofill_profiles_count";

  HISTOGRAM_PROFILE_NUM_USES = "AUTOFILL_PROFILE_NUM_USES";
  HISTOGRAM_PROFILE_NUM_USES_KEY = "address";

  // Fields that are record in `address_form` and `address_form_ext` telemetry
  SUPPORTED_FIELDS = {
    "street-address": "street_address",
    "address-line1": "address_line1",
    "address-line2": "address_line2",
    "address-line3": "address_line3",
    "address-level1": "address_level1",
    "address-level2": "address_level2",
    "postal-code": "postal_code",
    country: "country",
    name: "name",
    "given-name": "given_name",
    "additional-name": "additional_name",
    "family-name": "family_name",
    email: "email",
    organization: "organization",
    tel: "tel",
  };

  // Fields that are record in `address_form` event telemetry extra_keys
  static SUPPORTED_FIELDS_IN_FORM = [
    "street_address",
    "address_line1",
    "address_line2",
    "address_line3",
    "address_level2",
    "address_level1",
    "postal_code",
    "country",
  ];

  // Fields that are record in `address_form_ext` event telemetry extra_keys
  static SUPPORTED_FIELDS_IN_FORM_EXT = [
    "name",
    "given_name",
    "additional_name",
    "family_name",
    "email",
    "organization",
    "tel",
  ];

  recordFormEvent(method, flowId, extra) {
    let extExtra = {};
    if (["detected", "filled", "submitted"].includes(method)) {
      for (const [key, value] of Object.entries(extra)) {
        if (AddressTelemetry.SUPPORTED_FIELDS_IN_FORM_EXT.includes(key)) {
          extExtra[key] = value;
          delete extra[key];
        }
      }
    }

    Services.telemetry.recordEvent(
      this.EVENT_CATEGORY,
      method,
      this.EVENT_OBJECT_FORM_INTERACTION,
      flowId,
      extra
    );

    if (Object.keys(extExtra).length) {
      Services.telemetry.recordEvent(
        this.EVENT_CATEGORY,
        method,
        this.EVENT_OBJECT_FORM_INTERACTION_EXT,
        flowId,
        extExtra
      );
    }
  }
}

class CreditCardTelemetry extends AutofillTelemetryBase {
  EVENT_CATEGORY = "creditcard";
  EVENT_OBJECT_FORM_INTERACTION = "cc_form_v2";

  SCALAR_DETECTED_SECTION_COUNT =
    "formautofill.creditCards.detected_sections_count";
  SCALAR_SUBMITTED_SECTION_COUNT =
    "formautofill.creditCards.submitted_sections_count";
  SCALAR_AUTOFILL_PROFILE_COUNT =
    "formautofill.creditCards.autofill_profiles_count";

  HISTOGRAM_NUM_USES = "CREDITCARD_NUM_USES";
  HISTOGRAM_PROFILE_NUM_USES = "AUTOFILL_PROFILE_NUM_USES";
  HISTOGRAM_PROFILE_NUM_USES_KEY = "credit_card";

  // Mapping of field name used in formautofill code to the field name
  // used in the telemetry.
  SUPPORTED_FIELDS = {
    "cc-name": "cc_name",
    "cc-number": "cc_number",
    "cc-type": "cc_type",
    "cc-exp": "cc_exp",
    "cc-exp-month": "cc_exp_month",
    "cc-exp-year": "cc_exp_year",
  };

  recordLegacyFormEvent(method, flowId, extra = null) {
    Services.telemetry.recordEvent(
      this.EVENT_CATEGORY,
      method,
      "cc_form",
      flowId,
      extra
    );
  }

  recordFormDetected(section) {
    super.recordFormDetected(section);

    let identified = new Set();
    section.fieldDetails.forEach(detail => {
      identified.add(detail.fieldName);
    });
    let extra = {
      cc_name_found: identified.has("cc-name") ? "true" : "false",
      cc_number_found: identified.has("cc-number") ? "true" : "false",
      cc_exp_found:
        identified.has("cc-exp") ||
        (identified.has("cc-exp-month") && identified.has("cc-exp-year"))
          ? "true"
          : "false",
    };

    this.recordLegacyFormEvent("detected", section.flowId, extra);
  }

  recordPopupShown(section, fieldName) {
    super.recordPopupShown(section, fieldName);

    this.recordLegacyFormEvent("popup_shown", section.flowId);
  }

  recordFormFilled(section, profile) {
    super.recordFormFilled(section, profile);
    // Calculate values for telemetry
    let extra = {
      cc_name: "unavailable",
      cc_number: "unavailable",
      cc_exp: "unavailable",
    };

    for (let fieldDetail of section.fieldDetails) {
      let element = fieldDetail.elementWeakRef.get();
      let state = profile[fieldDetail.fieldName] ? "filled" : "not_filled";
      if (
        fieldDetail.state == FIELD_STATES.NORMAL &&
        (HTMLSelectElement.isInstance(element) ||
          (HTMLInputElement.isInstance(element) && element.value.length))
      ) {
        state = "user_filled";
      }
      switch (fieldDetail.fieldName) {
        case "cc-name":
          extra.cc_name = state;
          break;
        case "cc-number":
          extra.cc_number = state;
          break;
        case "cc-exp":
        case "cc-exp-month":
        case "cc-exp-year":
          extra.cc_exp = state;
          break;
      }
    }

    this.recordLegacyFormEvent("filled", section.flowId, extra);
  }

  recordFilledModified(section, fieldName) {
    super.recordFilledModified(section, fieldName);

    let extra = { field_name: fieldName };
    this.recordLegacyFormEvent("filled_modified", section.flowId, extra);
  }

  /**
   * Called when a credit card form is submitted
   *
   * @param {object} section Section that produces this record
   * @param {object} record Credit card record filled in the form.
   * @param {Array<HTMLForm>} form Form that contains the section
   */
  recordFormSubmitted(section, record, form) {
    super.recordFormSubmitted(section, record, form);

    // For legacy cc_form event telemetry
    let extra = {
      fields_not_auto: "0",
      fields_auto: "0",
      fields_modified: "0",
    };

    if (record.guid !== null) {
      let totalCount = form.elements.length;
      let autofilledCount = Object.keys(record.record).length;
      let unmodifiedCount = record.untouchedFields.length;

      extra.fields_not_auto = (totalCount - autofilledCount).toString();
      extra.fields_auto = autofilledCount.toString();
      extra.fields_modified = (autofilledCount - unmodifiedCount).toString();
    } else {
      // If the `guid` is null, we're filling a new form.
      // In that case, all not-null fields are manually filled.
      extra.fields_not_auto = Array.from(form.elements)
        .filter(element => !!element.value?.trim().length)
        .length.toString();
    }

    this.recordLegacyFormEvent("submitted", section.flowId, extra);
  }

  recordNumberOfUse(records) {
    super.recordNumberOfUse(records);

    if (!this.HISTOGRAM_NUM_USES) {
      return;
    }

    let histogram = Services.telemetry.getHistogramById(
      this.HISTOGRAM_NUM_USES
    );
    histogram.clear();

    for (let record of records) {
      histogram.add(record.timesUsed);
    }
  }
}

class AutofillTelemetry {
  static #creditCardTelemetry = new CreditCardTelemetry();
  static #addressTelemetry = new AddressTelemetry();

  // const for `type` parameter used in the utility functions
  static ADDRESS = "address";
  static CREDIT_CARD = "creditcard";

  static #getTelemetryBySection(section) {
    return section instanceof FormAutofillCreditCardSection
      ? this.#creditCardTelemetry
      : this.#addressTelemetry;
  }

  static #getTelemetryByType(type) {
    return type == AutofillTelemetry.CREDIT_CARD
      ? this.#creditCardTelemetry
      : this.#addressTelemetry;
  }
  /**
   * Utility functions for `doorhanger` event (defined in Events.yaml)
   *
   * Category: address or creditcard
   * Event name: doorhanger
   */

  static recordDoorhangerShown(type, record) {
    const telemetry = this.#getTelemetryByType(type);
    telemetry.recordDoorhangerEvent("show", record);
  }

  static recordDoorhangerClicked(type, method, record) {
    const telemetry = this.#getTelemetryByType(type);

    // We don't have `create` method in telemetry, we treat `create` as `save`
    switch (method) {
      case "create":
        method = "save";
        break;
      case "open-pref":
        method = "pref";
        break;
    }

    telemetry.recordDoorhangerEvent(method, record);
  }

  /**
   * Utility functions for form event (defined in Events.yaml)
   *
   * Category: address or creditcard
   * Event name: cc_form, cc_form_v2, or address_form
   */

  static recordFormInteractionEvent(
    method,
    section,
    { fieldName, profile, record, form } = {}
  ) {
    const telemetry = this.#getTelemetryBySection(section);
    telemetry.recordFormInteractionEvent(method, section, {
      fieldName,
      profile,
      record,
      form,
    });
  }

  /**
   * Utility functions for submitted section count scalar (defined in Scalars.yaml)
   *
   * Category: formautofill.creditCards or formautofill.addresses
   * Scalar name: submitted_sections_count
   */
  static recordDetectedSectionCount(section) {
    const telemetry = this.#getTelemetryBySection(section);
    telemetry.recordDetectedSectionCount();
  }

  static recordSubmittedSectionCount(type, count) {
    const telemetry = this.#getTelemetryByType(type);
    telemetry.recordSubmittedSectionCount(count);
  }

  static recordManageEvent(type, method) {
    const telemetry = this.#getTelemetryByType(type);
    telemetry.recordManageEvent(method, "manage");
  }

  static recordAutofillProfileCount(type, count) {
    const telemetry = this.#getTelemetryByType(type);
    telemetry.recordAutofillProfileCount(count);
  }

  /**
   * Utility functions for address/credit card number of use
   */
  static recordNumberOfUse(type, records) {
    const telemetry = this.#getTelemetryByType(type);
    telemetry.recordNumberOfUse(records);
  }
}
