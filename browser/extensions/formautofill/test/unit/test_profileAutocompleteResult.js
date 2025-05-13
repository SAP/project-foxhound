"use strict";

var AddressResult, CreditCardResult;
add_setup(async () => {
  ({ AddressResult, CreditCardResult } = ChromeUtils.importESModule(
    "resource://autofill/ProfileAutoCompleteResult.sys.mjs"
  ));
});

let matchingProfiles = [
  {
    guid: "test-guid-1",
    "given-name": "Timothy",
    "family-name": "Berners-Lee",
    name: "Timothy Berners-Lee",
    organization: "Sesame Street",
    "street-address": "123 Sesame Street.",
    "address-line1": "123 Sesame Street.",
    tel: "1-345-345-3456.",
  },
  {
    guid: "test-guid-2",
    "given-name": "John",
    "family-name": "Doe",
    name: "John Doe",
    organization: "Mozilla",
    "street-address": "331 E. Evelyn Avenue",
    "address-line1": "331 E. Evelyn Avenue",
    tel: "1-650-903-0800",
  },
  {
    guid: "test-guid-3",
    organization: "",
    "street-address": "321, No Name St. 2nd line 3rd line",
    "-moz-street-address-one-line": "321, No Name St. 2nd line 3rd line",
    "address-line1": "321, No Name St.",
    "address-line2": "2nd line",
    "address-line3": "3rd line",
    tel: "1-000-000-0000",
  },
];

let allFieldNames = [
  "given-name",
  "family-name",
  "street-address",
  "address-line1",
  "address-line2",
  "address-line3",
  "organization",
  "tel",
];

function makeAddressComment({ primary, secondary, status, profile }) {
  return JSON.stringify({
    primary,
    secondary,
    status,
    ariaLabel: primary + " " + secondary + " " + status,
    fillMessageName: "FormAutofill:FillForm",
    fillMessageData: { profile },
  });
}

function makeCreditCardComment({
  primary,
  secondary,
  ariaLabel,
  image,
  profile,
}) {
  return JSON.stringify({
    primary,
    secondary,
    ariaLabel,
    image,
    fillMessageName: "FormAutofill:FillForm",
    fillMessageData: { profile },
  });
}

let addressTestCases = [
  {
    description: "Focus on an `organization` field",
    options: {},
    matchingProfiles,
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "organization" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
      defaultIndex: 0,
      items: [
        {
          value: "",
          style: "autofill",
          label: "Sesame Street",
          comment: makeAddressComment({
            primary: "Sesame Street",
            secondary: "123 Sesame Street.",
            status: "Also autofills address, name, phone",
            profile: matchingProfiles[0],
          }),
          image: "",
        },
        {
          value: "",
          style: "autofill",
          label: "Mozilla",
          comment: makeAddressComment({
            primary: "Mozilla",
            secondary: "331 E. Evelyn Avenue",
            status: "Also autofills address, name, phone",
            profile: matchingProfiles[1],
          }),
          image: "",
        },
      ],
    },
  },
  {
    description: "Focus on an `tel` field",
    options: {},
    matchingProfiles,
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "tel" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
      defaultIndex: 0,
      items: [
        {
          value: "",
          style: "autofill",
          label: "1-345-345-3456.",
          comment: makeAddressComment({
            primary: "1-345-345-3456.",
            secondary: "123 Sesame Street.",
            status: "Also autofills address, name, organization",
            profile: matchingProfiles[0],
          }),
          image: "",
        },
        {
          value: "",
          style: "autofill",
          label: "1-650-903-0800",
          comment: makeAddressComment({
            primary: "1-650-903-0800",
            secondary: "331 E. Evelyn Avenue",
            status: "Also autofills address, name, organization",
            profile: matchingProfiles[1],
          }),
          image: "",
        },
        {
          value: "",
          style: "autofill",
          label: "1-000-000-0000",
          comment: makeAddressComment({
            primary: "1-000-000-0000",
            secondary: "321, No Name St. 2nd line 3rd line",
            status: "Also autofills address",
            profile: matchingProfiles[2],
          }),
          image: "",
        },
      ],
    },
  },
  {
    description: "Focus on an `street-address` field",
    options: {},
    matchingProfiles,
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "street-address" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
      defaultIndex: 0,
      items: [
        {
          value: "",
          style: "autofill",
          label: "123 Sesame Street.",
          comment: makeAddressComment({
            primary: "123 Sesame Street.",
            secondary: "Timothy Berners-Lee",
            status: "Also autofills name, organization, phone",
            profile: matchingProfiles[0],
          }),
          image: "",
        },
        {
          value: "",
          style: "autofill",
          label: "331 E. Evelyn Avenue",
          comment: makeAddressComment({
            primary: "331 E. Evelyn Avenue",
            secondary: "John Doe",
            status: "Also autofills name, organization, phone",
            profile: matchingProfiles[1],
          }),
          image: "",
        },
        {
          value: "",
          style: "autofill",
          label: "321, No Name St. 2nd line 3rd line",
          comment: makeAddressComment({
            primary: "321, No Name St. 2nd line 3rd line",
            secondary: "1-000-000-0000",
            status: "Also autofills phone",
            profile: matchingProfiles[2],
          }),
          image: "",
        },
      ],
    },
  },
  {
    description: "Focus on an `address-line1` field",
    options: {},
    matchingProfiles,
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "address-line1" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
      defaultIndex: 0,
      items: [
        {
          value: "",
          style: "autofill",
          label: "123 Sesame Street.",
          comment: makeAddressComment({
            primary: "123 Sesame Street.",
            secondary: "Timothy Berners-Lee",
            status: "Also autofills name, organization, phone",
            profile: matchingProfiles[0],
          }),
          image: "",
        },
        {
          value: "",
          style: "autofill",
          label: "331 E. Evelyn Avenue",
          comment: makeAddressComment({
            primary: "331 E. Evelyn Avenue",
            secondary: "John Doe",
            status: "Also autofills name, organization, phone",
            profile: matchingProfiles[1],
          }),
          image: "",
        },
        {
          value: "",
          style: "autofill",
          label: "321, No Name St.",
          comment: makeAddressComment({
            primary: "321, No Name St.",
            secondary: "1-000-000-0000",
            status: "Also autofills phone",
            profile: matchingProfiles[2],
          }),
          image: "",
        },
      ],
    },
  },
  {
    description: "No matching profiles",
    options: {},
    matchingProfiles: [],
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_NOMATCH,
      defaultIndex: 0,
      items: [],
    },
  },
  {
    description: "Search with failure",
    options: { resultCode: Ci.nsIAutoCompleteResult.RESULT_FAILURE },
    matchingProfiles: [],
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_FAILURE,
      defaultIndex: 0,
      items: [],
    },
  },
];

matchingProfiles = [
  {
    guid: "test-guid-1",
    "cc-name": "Timothy Berners-Lee",
    "cc-number": "************6785",
    "cc-exp-month": 12,
    "cc-exp-year": 2014,
    "cc-type": "visa",
  },
  {
    guid: "test-guid-2",
    "cc-name": "John Doe",
    "cc-number": "************1234",
    "cc-exp-month": 4,
    "cc-exp-year": 2014,
    "cc-type": "amex",
  },
  {
    guid: "test-guid-3",
    "cc-number": "************5678",
    "cc-exp-month": 8,
    "cc-exp-year": 2018,
  },
];

allFieldNames = ["cc-name", "cc-number", "cc-exp-month", "cc-exp-year"];

let creditCardTestCases = [
  {
    description: "Focus on a `cc-name` field",
    options: {},
    matchingProfiles,
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "cc-name" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
      defaultIndex: 0,
      items: [
        {
          value: "",
          style: "autofill",
          label: "Timothy Berners-Lee",
          comment: makeCreditCardComment({
            primary: "Timothy Berners-Lee",
            secondary: "••••6785",
            ariaLabel: "Visa Timothy Berners-Lee ****6785",
            image: "chrome://formautofill/content/third-party/cc-logo-visa.svg",
            profile: matchingProfiles[0],
          }),
          image: "chrome://formautofill/content/third-party/cc-logo-visa.svg",
        },
        {
          value: "",
          style: "autofill",
          label: "John Doe",
          comment: makeCreditCardComment({
            primary: "John Doe",
            secondary: "••••1234",
            ariaLabel: "American Express John Doe ****1234",
            image: "chrome://formautofill/content/third-party/cc-logo-amex.png",
            profile: matchingProfiles[1],
          }),
          image: "chrome://formautofill/content/third-party/cc-logo-amex.png",
        },
      ],
    },
  },
  {
    description: "Focus on a `cc-number` field",
    options: {},
    matchingProfiles,
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "cc-number" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
      defaultIndex: 0,
      items: [
        {
          value: "",
          style: "autofill",
          label: "••••6785",
          comment: makeCreditCardComment({
            primary: "••••6785",
            secondary: "Timothy Berners-Lee",
            ariaLabel: "Visa 6785 Timothy Berners-Lee",
            image: "chrome://formautofill/content/third-party/cc-logo-visa.svg",
            profile: matchingProfiles[0],
          }),
          image: "chrome://formautofill/content/third-party/cc-logo-visa.svg",
        },
        {
          value: "",
          style: "autofill",
          label: "••••1234",
          comment: makeCreditCardComment({
            primary: "••••1234",
            secondary: "John Doe",
            ariaLabel: "American Express 1234 John Doe",
            image: "chrome://formautofill/content/third-party/cc-logo-amex.png",
            profile: matchingProfiles[1],
          }),
          image: "chrome://formautofill/content/third-party/cc-logo-amex.png",
        },
        {
          value: "",
          style: "autofill",
          label: "••••5678",
          comment: makeCreditCardComment({
            primary: "••••5678",
            secondary: "",
            ariaLabel: "5678",
            image: "chrome://formautofill/content/icon-credit-card-generic.svg",
            profile: matchingProfiles[2],
          }),
          image: "chrome://formautofill/content/icon-credit-card-generic.svg",
        },
      ],
    },
  },
  {
    description: "No matching profiles",
    options: {},
    matchingProfiles: [],
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_NOMATCH,
      defaultIndex: 0,
      items: [],
    },
  },
  {
    description: "Search with failure",
    options: { resultCode: Ci.nsIAutoCompleteResult.RESULT_FAILURE },
    matchingProfiles: [],
    allFieldNames,
    searchString: "",
    fieldDetail: { fieldName: "" },
    expected: {
      searchResult: Ci.nsIAutoCompleteResult.RESULT_FAILURE,
      defaultIndex: 0,
      items: [],
    },
  },
];

add_task(async function test_all_patterns() {
  let testSets = [
    {
      collectionConstructor: AddressResult,
      testCases: addressTestCases,
    },
    {
      collectionConstructor: CreditCardResult,
      testCases: creditCardTestCases,
    },
  ];

  testSets.forEach(({ collectionConstructor, testCases }) => {
    testCases.forEach(testCase => {
      info("Starting testcase: " + testCase.description);
      let actual = new collectionConstructor(
        testCase.searchString,
        testCase.fieldDetail,
        testCase.allFieldNames,
        testCase.matchingProfiles,
        testCase.options
      );
      let expectedValue = testCase.expected;
      let expectedItemLength = expectedValue.items.length;
      // If the last item shows up as a footer, we expect one more item
      // than expected.
      if (actual.getStyleAt(actual.matchCount - 1) == "action") {
        expectedItemLength++;
      }
      // Add one row for the status.
      if (
        actual.matchCount > 2 &&
        actual.getStyleAt(actual.matchCount - 2) == "status"
      ) {
        expectedItemLength++;
      }

      equal(actual.searchResult, expectedValue.searchResult);
      equal(actual.defaultIndex, expectedValue.defaultIndex);
      equal(actual.matchCount, expectedItemLength);
      expectedValue.items.forEach((item, index) => {
        equal(actual.getValueAt(index), item.value);
        Assert.deepEqual(
          JSON.parse(actual.getCommentAt(index)),
          JSON.parse(item.comment)
        );
        equal(actual.getLabelAt(index), item.label);
        equal(actual.getStyleAt(index), item.style);
        equal(actual.getImageAt(index), item.image);
      });

      if (expectedValue.items.length) {
        Assert.throws(
          () => actual.getValueAt(expectedItemLength),
          /Index out of range\./
        );

        Assert.throws(
          () => actual.getLabelAt(expectedItemLength),
          /Index out of range\./
        );

        Assert.throws(
          () => actual.getCommentAt(expectedItemLength),
          /Index out of range\./
        );
      }
    });
  });
});
