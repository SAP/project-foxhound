/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

const { ExtensionAPI } = ExtensionCommon;

AddonTestUtils.init(this);
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "1",
  "42"
);

// Because the `mockExtensionAPI` is currently the only "mock" API that has
// WebIDL bindings, this is the only namespace we can use in our tests. There
// is no JSON schema for this namespace so we add one here that is tailored for
// our testing needs.
const API = class extends ExtensionAPI {
  getAPI(context) {
    return {
      mockExtensionAPI: {
        methodAsync: () => {
          return "some-value";
        },
      },
    };
  }
};

const SCHEMA = [
  {
    namespace: "mockExtensionAPI",
    functions: [
      {
        name: "methodAsync",
        type: "function",
        async: true,
        parameters: [
          {
            name: "arg",
            type: "string",
            enum: ["THE_ONLY_VALUE_ALLOWED"],
          },
        ],
      },
    ],
  },
];

add_setup(async function() {
  await AddonTestUtils.promiseStartupManager();

  // The blob:-URL registered in `registerModules()` below gets loaded at:
  // https://searchfox.org/mozilla-central/rev/0fec57c05d3996cc00c55a66f20dd5793a9bfb5d/toolkit/components/extensions/ExtensionCommon.jsm#1649
  Services.prefs.setBoolPref(
    "security.allow_parent_unrestricted_js_loads",
    true
  );

  ExtensionParent.apiManager.registerModules({
    mockExtensionAPI: {
      schema: `data:,${JSON.stringify(SCHEMA)}`,
      scopes: ["addon_parent"],
      paths: [["mockExtensionAPI"]],
      url: URL.createObjectURL(
        new Blob([`this.mockExtensionAPI = ${API.toString()}`])
      ),
    },
  });
});

add_task(async function test_schema_error_is_propagated_to_extension() {
  await runExtensionAPITest("should throw an extension error", {
    backgroundScript() {
      return browser.mockExtensionAPI.methodAsync("UNEXPECTED_VALUE");
    },
    mockAPIRequestHandler(policy, request) {
      return this._handleAPIRequest_orig(policy, request);
    },
    assertResults({ testError }) {
      Assert.ok(
        /Invalid enumeration value "UNEXPECTED_VALUE"/.test(testError.message)
      );
    },
  });
});

add_task(async function test_schema_error_no_error_with_expected_value() {
  await runExtensionAPITest("should not throw any error", {
    backgroundScript() {
      return browser.mockExtensionAPI.methodAsync("THE_ONLY_VALUE_ALLOWED");
    },
    mockAPIRequestHandler(policy, request) {
      return this._handleAPIRequest_orig(policy, request);
    },
    assertResults({ testError, testResult }) {
      Assert.deepEqual(testError, undefined);
      Assert.deepEqual(testResult, "some-value");
    },
  });
});

add_task(async function test_schema_data_not_found_or_unexpected_schema_type() {
  const { Schemas } = ChromeUtils.import("resource://gre/modules/Schemas.jsm");

  const mockSchemaExtContext = {};

  const testSchemasErrorOnWebIDLRequest = testCase => {
    if (testCase.expectedExceptions) {
      const expectedExceptions = Array.isArray(testCase.expectedExceptions)
        ? testCase.expectedExceptions
        : [testCase.expectedExceptions];
      expectedExceptions.forEach(expectedException =>
        Assert.throws(
          () =>
            Schemas.checkWebIDLRequestParameters(
              testCase.mockSchemaExtContext,
              testCase.mockWebIDLAPIRequest
            ),
          expectedException,
          `Got the expected error on ${testCase.description}`
        )
      );
    } else {
      throw new Error(
        `Test case ${testCase.description} is missing mandatory expectedExceptions test case property`
      );
    }
  };

  const TEST_CASES = [
    {
      description:
        "callFunction API request for non existing nested API namespace",
      mockSchemaExtContext,
      mockWebIDLAPIRequest: {
        apiNamespace: "browserSettings.unknownNamespace",
        apiName: "get",
        requestType: "callFunction",
      },
      expectedExceptions: /API Schema not found for browserSettings\.unknownNamespace/,
    },
    {
      description:
        "addListener API request for non existing API event property",
      mockSchemaExtContext,
      mockWebIDLAPIRequest: {
        apiNamespace: "browserSettings.nonExistingSetting",
        apiName: "onChange",
        requestType: "addListener",
      },
      expectedExceptions: /API Schema not found for browserSettings\.nonExistingSetting/,
    },
    {
      description:
        "callFunction on non existing method from existing nested API namespace",
      mockSchemaExtContext,
      mockWebIDLAPIRequest: {
        apiNamespace: "browserSettings.colorManagement.mode",
        apiName: "nonExistingMethod",
        requestType: "callFunction",
      },
      expectedExceptions: [
        /API Schema for "nonExistingMethod" not found in browserSettings\.colorManagement\.mode/,
        /\(browserSettings\.colorManagement\.mode type is SubModuleProperty\)/,
      ],
    },
    {
      description:
        "callFunction on non existing method from existing API namespace",
      mockSchemaExtContext,
      mockWebIDLAPIRequest: {
        apiNamespace: "browserSettings",
        apiName: "nonExistingMethod",
        requestType: "callFunction",
      },
      expectedExceptions: /API Schema not found for browserSettings\.nonExistingMethod/,
    },
    {
      description:
        "callFunction on existing property but unexpected schema type",
      mockSchemaExtContext,
      mockWebIDLAPIRequest: {
        apiNamespace: "tabs",
        apiName: "TAB_ID_NONE",
        requestType: "callFunction",
      },
      expectedExceptions: [
        /Unexpected API Schema type for tabs.TAB_ID_NONE/,
        /tabs.TAB_ID_NONE type is ValueProperty/,
      ],
    },
  ];

  TEST_CASES.forEach(testSchemasErrorOnWebIDLRequest);
});
