/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  CreditCard: "resource://gre/modules/CreditCard.sys.mjs",
  FormAutofillUtils: "resource://gre/modules/shared/FormAutofillUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(
  lazy,
  "l10n",
  () => new Localization(["toolkit/formautofill/formAutofill.ftl"], true)
);

class ProfileAutoCompleteResult {
  externalEntries = [];

  constructor(
    searchString,
    focusedFieldName,
    allFieldNames,
    matchingProfiles,
    { resultCode = null, isSecure = true, isInputAutofilled = false }
  ) {
    // nsISupports
    this.QueryInterface = ChromeUtils.generateQI(["nsIAutoCompleteResult"]);

    // The user's query string
    this.searchString = searchString;
    // The field name of the focused input.
    this._focusedFieldName = focusedFieldName;
    // The matching profiles contains the information for filling forms.
    this._matchingProfiles = matchingProfiles;
    // The default item that should be entered if none is selected
    this.defaultIndex = 0;
    // The reason the search failed
    this.errorDescription = "";
    // The value used to determine whether the form is secure or not.
    this._isSecure = isSecure;
    // The value to indicate whether the focused input has been autofilled or not.
    this._isInputAutofilled = isInputAutofilled;
    // All fillable field names in the form including the field name of the currently-focused input.
    this._allFieldNames = [
      ...this._matchingProfiles.reduce((fieldSet, curProfile) => {
        for (let field of Object.keys(curProfile)) {
          fieldSet.add(field);
        }

        return fieldSet;
      }, new Set()),
    ].filter(field => allFieldNames.includes(field));

    // Force return success code if the focused field is auto-filled in order
    // to show clear form button popup.
    if (isInputAutofilled) {
      resultCode = Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
    }
    // The result code of this result object.
    if (resultCode) {
      this.searchResult = resultCode;
    } else {
      this.searchResult = matchingProfiles.length
        ? Ci.nsIAutoCompleteResult.RESULT_SUCCESS
        : Ci.nsIAutoCompleteResult.RESULT_NOMATCH;
    }

    // An array of primary and secondary labels for each profile.
    this._popupLabels = this._generateLabels(
      this._focusedFieldName,
      this._allFieldNames,
      this._matchingProfiles
    );
  }

  getAt(index) {
    for (const group of [this._popupLabels, this.externalEntries]) {
      if (index < group.length) {
        return group[index];
      }
      index -= group.length;
    }

    throw Components.Exception(
      "Index out of range.",
      Cr.NS_ERROR_ILLEGAL_VALUE
    );
  }

  /**
   * @returns {number} The number of results
   */
  get matchCount() {
    return this._popupLabels.length + this.externalEntries.length;
  }

  /**
   * Get the secondary label based on the focused field name and related field names
   * in the same form.
   *
   * @param   {string} _focusedFieldName The field name of the focused input
   * @param   {Array<object>} _allFieldNames The field names in the same section
   * @param   {object} _profile The profile providing the labels to show.
   * @returns {string} The secondary label
   */
  _getSecondaryLabel(_focusedFieldName, _allFieldNames, _profile) {
    return "";
  }

  _generateLabels(_focusedFieldName, _allFieldNames, _profiles) {}

  /**
   * Get the value of the result at the given index.
   *
   * Always return empty string for form autofill feature to suppress
   * AutoCompleteController from autofilling, as we'll populate the
   * fields on our own.
   *
   * @param   {number} index The index of the result requested
   * @returns {string} The result at the specified index
   */
  getValueAt(index) {
    this.getAt(index);
    return "";
  }

  getLabelAt(index) {
    const label = this.getAt(index);
    return typeof label == "string" ? label : label.primary;
  }

  /**
   * Retrieves a comment (metadata instance)
   *
   * @param   {number} index The index of the comment requested
   * @returns {string} The comment at the specified index
   */
  getCommentAt(index) {
    const item = this.getAt(index);
    if (item.style == "status") {
      return JSON.stringify(item);
    }

    let type = this.getTypeOfIndex(index);
    switch (type) {
      case "clear":
        return '{"fillMessageName": "FormAutofill:ClearForm"}';
      case "manage":
        return '{"fillMessageName": "FormAutofill:OpenPreferences"}';
      case "insecure":
        return '{"noLearnMore": true }';
    }

    if (item.comment) {
      return item.comment;
    }

    return JSON.stringify({
      ...item,
      fillMessageName: "FormAutofill:FillForm",
      fillMessageData: this._matchingProfiles[index],
    });
  }

  /**
   * Retrieves a style hint specific to a particular index.
   *
   * @param   {number} index The index of the style hint requested
   * @returns {string} The style hint at the specified index
   */
  getStyleAt(index) {
    const itemStyle = this.getAt(index).style;
    if (itemStyle) {
      return itemStyle;
    }

    switch (this.getTypeOfIndex(index)) {
      case "manage":
        return "action";
      case "clear":
        return "action";
      case "insecure":
        return "insecureWarning";
      default:
        return "autofill";
    }
  }

  /**
   * Retrieves an image url.
   *
   * @param   {number} index The index of the image url requested
   * @returns {string} The image url at the specified index
   */
  getImageAt(index) {
    return this.getAt(index).image ?? "";
  }

  /**
   * Retrieves a result
   *
   * @param   {number} index The index of the result requested
   * @returns {string} The result at the specified index
   */
  getFinalCompleteValueAt(index) {
    return this.getValueAt(index);
  }

  /**
   * Returns true if the value at the given index is removable
   *
   * @param   {number}  _index The index of the result to remove
   * @returns {boolean} True if the value is removable
   */
  isRemovableAt(_index) {
    return false;
  }

  /**
   * Removes a result from the resultset
   *
   * @param {number} _index The index of the result to remove
   */
  removeValueAt(_index) {
    // There is no plan to support removing profiles via autocomplete.
  }

  /**
   * Returns a type string that identifies te type of row at the given index.
   *
   * @param   {number} index The index of the result requested
   * @returns {string} The type at the specified index
   */
  getTypeOfIndex(index) {
    if (this._isInputAutofilled && index == 0) {
      return "clear";
    }

    if (index == this._popupLabels.length - 1) {
      return "manage";
    }

    return "item";
  }
}

export class AddressResult extends ProfileAutoCompleteResult {
  _getSecondaryLabel(focusedFieldName, allFieldNames, profile) {
    // We group similar fields into the same field name so we won't pick another
    // field in the same group as the secondary label.
    const GROUP_FIELDS = {
      name: ["name", "given-name", "additional-name", "family-name"],
      "street-address": [
        "street-address",
        "address-line1",
        "address-line2",
        "address-line3",
      ],
      "country-name": ["country", "country-name"],
      tel: [
        "tel",
        "tel-country-code",
        "tel-national",
        "tel-area-code",
        "tel-local",
        "tel-local-prefix",
        "tel-local-suffix",
      ],
    };

    const secondaryLabelOrder = [
      "street-address", // Street address
      "name", // Full name
      "address-level3", // Townland / Neighborhood / Village
      "address-level2", // City/Town
      "organization", // Company or organization name
      "address-level1", // Province/State (Standardized code if possible)
      "country-name", // Country name
      "postal-code", // Postal code
      "tel", // Phone number
      "email", // Email address
    ];

    for (let field in GROUP_FIELDS) {
      if (GROUP_FIELDS[field].includes(focusedFieldName)) {
        focusedFieldName = field;
        break;
      }
    }

    for (const currentFieldName of secondaryLabelOrder) {
      if (focusedFieldName == currentFieldName || !profile[currentFieldName]) {
        continue;
      }

      let matching = GROUP_FIELDS[currentFieldName]
        ? allFieldNames.some(fieldName =>
            GROUP_FIELDS[currentFieldName].includes(fieldName)
          )
        : allFieldNames.includes(currentFieldName);

      if (matching) {
        if (
          currentFieldName == "street-address" &&
          profile["-moz-street-address-one-line"]
        ) {
          return profile["-moz-street-address-one-line"];
        }
        return profile[currentFieldName];
      }
    }

    return ""; // Nothing matched.
  }

  _generateLabels(focusedFieldName, allFieldNames, profiles) {
    const manageLabel = lazy.l10n.formatValueSync(
      "autofill-manage-addresses-label"
    );

    let footerItem = {
      primary: manageLabel,
      secondary: "",
    };

    if (this._isInputAutofilled) {
      const clearLabel = lazy.l10n.formatValueSync("autofill-clear-form-label");

      let labels = [
        {
          primary: clearLabel,
        },
      ];
      labels.push(footerItem);
      return labels;
    }

    let focusedCategory =
      lazy.FormAutofillUtils.getCategoryFromFieldName(focusedFieldName);

    // Skip results without a primary label.
    let labels = profiles
      .filter(profile => {
        return !!profile[focusedFieldName];
      })
      .map(profile => {
        let primaryLabel = profile[focusedFieldName];
        if (
          focusedFieldName == "street-address" &&
          profile["-moz-street-address-one-line"]
        ) {
          primaryLabel = profile["-moz-street-address-one-line"];
        }

        let profileFields = allFieldNames.filter(
          fieldName => !!profile[fieldName]
        );

        let categories =
          lazy.FormAutofillUtils.getCategoriesFromFieldNames(profileFields);
        let status = this.getStatusNote(categories, focusedCategory);
        let secondary = this._getSecondaryLabel(
          focusedFieldName,
          allFieldNames,
          profile
        );
        const ariaLabel = [primaryLabel, secondary, status]
          .filter(chunk => !!chunk) // Exclude empty chunks.
          .join(" ");
        return {
          primary: primaryLabel,
          secondary,
          status,
          ariaLabel,
        };
      });

    let allCategories =
      lazy.FormAutofillUtils.getCategoriesFromFieldNames(allFieldNames);

    if (allCategories && allCategories.length) {
      let statusItem = {
        primary: "",
        secondary: "",
        status: this.getStatusNote(allCategories, focusedCategory),
        style: "status",
      };
      labels.push(statusItem);
    }

    labels.push(footerItem);

    return labels;
  }

  getStatusNote(categories, focusedCategory) {
    if (!categories || !categories.length) {
      return "";
    }

    // If the length of categories is 1, that means all the fillable fields are in the same
    // category. We will change the way to inform user according to this flag. When the value
    // is true, we show "Also autofills ...", otherwise, show "Autofills ..." only.
    let hasExtraCategories = categories.length > 1;
    // Show the categories in certain order to conform with the spec.
    let orderedCategoryList = [
      "address",
      "name",
      "organization",
      "tel",
      "email",
    ];
    let showCategories = hasExtraCategories
      ? orderedCategoryList.filter(
          category =>
            categories.includes(category) && category != focusedCategory
        )
      : [orderedCategoryList.find(category => category == focusedCategory)];

    let formatter = new Intl.ListFormat(undefined, {
      style: "narrow",
    });

    let categoriesText = showCategories.map(category =>
      lazy.l10n.formatValueSync("autofill-category-" + category)
    );
    categoriesText = formatter.format(categoriesText);

    let statusTextTmplKey = hasExtraCategories
      ? "autofill-phishing-warningmessage-extracategory"
      : "autofill-phishing-warningmessage";
    return lazy.l10n.formatValueSync(statusTextTmplKey, {
      categories: categoriesText,
    });
  }
}

export class CreditCardResult extends ProfileAutoCompleteResult {
  _getSecondaryLabel(focusedFieldName, allFieldNames, profile) {
    const GROUP_FIELDS = {
      "cc-name": [
        "cc-name",
        "cc-given-name",
        "cc-additional-name",
        "cc-family-name",
      ],
      "cc-exp": ["cc-exp", "cc-exp-month", "cc-exp-year"],
    };

    const secondaryLabelOrder = [
      "cc-number", // Credit card number
      "cc-name", // Full name
      "cc-exp", // Expiration date
    ];

    for (let field in GROUP_FIELDS) {
      if (GROUP_FIELDS[field].includes(focusedFieldName)) {
        focusedFieldName = field;
        break;
      }
    }

    for (const currentFieldName of secondaryLabelOrder) {
      if (focusedFieldName == currentFieldName || !profile[currentFieldName]) {
        continue;
      }

      let matching = GROUP_FIELDS[currentFieldName]
        ? allFieldNames.some(fieldName =>
            GROUP_FIELDS[currentFieldName].includes(fieldName)
          )
        : allFieldNames.includes(currentFieldName);

      if (matching) {
        if (currentFieldName == "cc-number") {
          return lazy.CreditCard.formatMaskedNumber(profile[currentFieldName]);
        }
        return profile[currentFieldName];
      }
    }

    return ""; // Nothing matched.
  }

  _generateLabels(focusedFieldName, allFieldNames, profiles) {
    if (!this._isSecure) {
      let brandName =
        lazy.FormAutofillUtils.brandBundle.GetStringFromName("brandShortName");

      return [
        lazy.FormAutofillUtils.stringBundle.formatStringFromName(
          "insecureFieldWarningDescription",
          [brandName]
        ),
      ];
    }

    const manageLabel = lazy.l10n.formatValueSync(
      "autofill-manage-payment-methods-label"
    );

    let footerItem = {
      primary: manageLabel,
    };

    if (this._isInputAutofilled) {
      const clearLabel = lazy.l10n.formatValueSync("autofill-clear-form-label");

      let labels = [
        {
          primary: clearLabel,
        },
      ];
      labels.push(footerItem);
      return labels;
    }

    // Skip results without a primary label.
    let labels = profiles
      .filter(profile => {
        return !!profile[focusedFieldName];
      })
      .map(profile => {
        let primary = profile[focusedFieldName];

        if (focusedFieldName == "cc-number") {
          primary = lazy.CreditCard.formatMaskedNumber(primary);
        }
        const secondary = this._getSecondaryLabel(
          focusedFieldName,
          allFieldNames,
          profile
        );
        // The card type is displayed visually using an image. For a11y, we need
        // to expose it as text. We do this using aria-label. However,
        // aria-label overrides the text content, so we must include that also.
        const ccType = profile["cc-type"];
        const image = lazy.CreditCard.getCreditCardLogo(ccType);
        const ccTypeL10nId = lazy.CreditCard.getNetworkL10nId(ccType);
        const ccTypeName = ccTypeL10nId
          ? lazy.l10n.formatValueSync(ccTypeL10nId)
          : ccType ?? ""; // Unknown card type
        const ariaLabel = [
          ccTypeName,
          primary.toString().replaceAll("*", ""),
          secondary,
        ]
          .filter(chunk => !!chunk) // Exclude empty chunks.
          .join(" ");
        return {
          primary: primary.toString().replaceAll("*", "•"),
          secondary: secondary.toString().replaceAll("*", "•"),
          ariaLabel,
          image,
        };
      });

    labels.push(footerItem);

    return labels;
  }

  getTypeOfIndex(index) {
    if (!this._isSecure) {
      return "insecure";
    }

    return super.getTypeOfIndex(index);
  }
}
