/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the elements for results are reusable.

ChromeUtils.defineESModuleGetters(this, {
  UrlbarProviderQuickSuggest:
    "moz-src:///browser/components/urlbar/UrlbarProviderQuickSuggest.sys.mjs",
});

const SIMPLE_GET_VIEW_TEMPLATE = () => {
  return {
    children: [
      {
        name: "text",
        tag: "span",
      },
    ],
  };
};

const SIMPLE_GET_VIEW_UPDATE = result => {
  return {
    text: {
      textContent: result.payload.value,
    },
  };
};

add_setup(async function setup() {
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  let originals = providersManager.providers;
  providersManager.providers = [];
  registerCleanupFunction(async function () {
    providersManager.providers = originals;
  });
});

add_task(async function provider() {
  const TEST_DATA = [
    {
      first: "SameTestProvider",
      second: "SameTestProvider",
      expectedReused: true,
    },
    {
      first: "FirstTestProvider",
      second: "SecondTestProvider",
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: first,
        results: [
          makeUrlResult({
            payload: {
              url: "https://example.com/first",
              title: "first example",
            },
          }),
        ],
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: second,
        results: [
          makeUrlResult({
            payload: {
              url: "https://example.com/second",
              title: "second example",
            },
          }),
        ],
      }),
      expectedReused,
    });
  }
});

add_task(async function isRichSuggestion() {
  const TEST_DATA = [
    {
      first: true,
      second: true,
      expectedReused: true,
    },
    {
      first: true,
      second: false,
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            isRichSuggestion: first,
            payload: {
              url: "https://example.com/first",
              title: "first example",
            },
          }),
        ],
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            isRichSuggestion: second,
            payload: {
              url: "https://example.com/second",
              title: "second example",
            },
          }),
        ],
      }),
      expectedReused,
    });
  }
});

add_task(async function heuristic() {
  const TEST_DATA = [
    {
      first: true,
      second: true,
      expectedReused: true,
    },
    {
      first: true,
      second: false,
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            heuristic: first,
            payload: {
              url: "https://example.com/first",
              title: "first example",
            },
          }),
        ],
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            heuristic: second,
            payload: {
              url: "https://example.com/second",
              title: "second example",
            },
          }),
        ],
      }),
      expectedReused,
    });
  }
});

add_task(async function result_menu() {
  const TEST_DATA = [
    {
      first: true,
      second: true,
      expectedReused: true,
      expectedButtons: {
        first: ["result-menu"],
        second: ["result-menu"],
      },
    },
    {
      first: true,
      second: false,
      expectedReused: false,
      expectedButtons: {
        first: ["result-menu"],
        second: [],
      },
    },
  ];

  for (let { first, second, expectedReused, expectedButtons } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            payload: {
              isManageable: first,
              url: "https://example.com/first",
              title: "first example",
            },
          }),
        ],
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            payload: {
              isBlockable: second,
              url: "https://example.com/second",
              title: "second example",
            },
          }),
        ],
      }),
      isButtonTest: true,
      expectedReused,
      expectedButtons,
    });
  }
});

add_task(async function showFeedbackMenu() {
  const TEST_DATA = [
    {
      first: true,
      second: true,
      expectedReused: true,
      expectedButtons: {
        first: ["result-menu"],
        second: ["result-menu"],
      },
    },
    {
      first: true,
      second: false,
      expectedReused: false,
      expectedButtons: {
        first: ["result-menu"],
        second: ["result-menu"],
      },
    },
  ];

  for (let { first, second, expectedReused, expectedButtons } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            showFeedbackMenu: first,
            payload: {
              isBlockable: true,
              url: "https://example.com/first",
              title: "first example",
            },
          }),
        ],
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            showFeedbackMenu: second,
            payload: {
              isBlockable: true,
              url: "https://example.com/second",
              title: "second example",
            },
          }),
        ],
      }),
      expectedReused,
      expectedButtons,
    });
  }
});

add_task(async function buttons() {
  const TEST_DATA = [
    {
      first: [
        {
          l10n: { id: "urlbar-search-tips-confirm" },
        },
        {
          l10n: { id: "urlbar-search-mode-bookmarks" },
        },
      ],
      second: [
        {
          l10n: { id: "urlbar-search-tips-confirm" },
        },
        {
          l10n: { id: "urlbar-search-mode-bookmarks" },
        },
      ],
      expectedReused: true,
      expectedButtons: {
        first: ["0", "1"],
        second: ["0", "1"],
      },
    },
    {
      first: [
        {
          l10n: { id: "urlbar-search-tips-confirm" },
        },
      ],
      second: [
        {
          l10n: { id: "urlbar-search-mode-bookmarks" },
        },
      ],
      expectedReused: false,
      expectedButtons: {
        first: ["0"],
        second: ["0"],
      },
    },
    {
      first: [
        {
          l10n: { id: "urlbar-search-tips-confirm" },
        },
        {
          l10n: { id: "urlbar-search-mode-bookmarks" },
        },
      ],
      second: [
        {
          l10n: { id: "urlbar-search-tips-confirm" },
        },
      ],
      expectedReused: false,
      expectedButtons: {
        first: ["0", "1"],
        second: ["0"],
      },
    },
  ];

  for (let { first, second, expectedReused, expectedButtons } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeTipResult({
            payload: {
              buttons: first,
              type: "test",
            },
          }),
        ],
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeTipResult({
            payload: {
              buttons: second,
              type: "test",
            },
          }),
        ],
      }),
      expectedReused,
      expectedButtons,
    });
  }
});

add_task(async function switchTab() {
  const TEST_DATA = [
    {
      first: UrlbarUtils.RESULT_TYPE.TAB_SWITCH,
      second: UrlbarUtils.RESULT_TYPE.TAB_SWITCH,
      expectedReused: true,
    },
    {
      first: UrlbarUtils.RESULT_TYPE.TAB_SWITCH,
      second: UrlbarUtils.RESULT_TYPE.URL,
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            type: first,
            payload: {
              userContextId: 1,
              url: "https://example.com/first",
              title: "first example",
            },
          }),
        ],
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeUrlResult({
            type: second,
            payload: {
              url: "https://example.com/second",
              title: "second example",
            },
          }),
        ],
      }),
      expectedReused,
    });
  }
});

add_task(async function dynamic_vs_not_dynamic() {
  await doTest({
    firstProvider: new UrlbarTestUtils.TestProvider({
      name: "TestProvider",
      results: [
        makeDynamicResult({
          payload: {
            dynamicType: "testDynamic",
            value: "first provider",
          },
        }),
      ],
      getViewTemplate: SIMPLE_GET_VIEW_TEMPLATE,
      getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
    }),
    secondProvider: new UrlbarTestUtils.TestProvider({
      name: "TestProvider",
      results: [
        makeUrlResult({
          payload: {
            url: "https://example.com/second",
            title: "second example",
          },
        }),
      ],
    }),
    expectedReused: false,
  });
});

add_task(async function dynamic_dynamicType() {
  const TEST_DATA = [
    {
      first: "same_type",
      second: "same_type",
      expectedReused: true,
    },
    {
      first: "first_type",
      second: "second_type",
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: first,
              value: "first provider",
            },
          }),
        ],
        getViewTemplate: SIMPLE_GET_VIEW_TEMPLATE,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: second,
              value: "second provider",
            },
          }),
        ],
        getViewTemplate: SIMPLE_GET_VIEW_TEMPLATE,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      expectedReused,
    });
  }
});

add_task(async function dynamic_template() {
  const TEST_DATA = [
    {
      first: {
        children: [
          {
            name: "text",
            tag: "span",
          },
        ],
      },
      second: {
        children: [
          {
            name: "text",
            tag: "span",
          },
        ],
      },
      expectedReused: true,
    },
    {
      first: {
        children: [
          {
            name: "text",
            tag: "span",
          },
        ],
      },
      second: {
        children: [
          {
            name: "text",
            tag: "div",
          },
        ],
      },
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: "testDynamic",
              value: "first provider",
              template: first,
            },
          }),
        ],
        getViewTemplate: result => result.payload.template,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: "TestProvider",
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: "testDynamic",
              value: "second provider",
              template: second,
            },
          }),
        ],
        getViewTemplate: result => result.payload.template,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      expectedReused,
    });
  }
});

add_task(async function quickSuggest_suggestionType() {
  const TEST_DATA = [
    {
      first: "same_type",
      second: "same_type",
      expectedReused: true,
    },
    {
      first: "first_type",
      second: "second_type",
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: UrlbarProviderQuickSuggest.name,
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: "testDynamic",
              suggestionType: first,
              value: "first provider",
            },
          }),
        ],
        getViewTemplate: SIMPLE_GET_VIEW_TEMPLATE,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: UrlbarProviderQuickSuggest.name,
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: "testDynamic",
              suggestionType: second,
              value: "second provider",
            },
          }),
        ],
        getViewTemplate: SIMPLE_GET_VIEW_TEMPLATE,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      expectedReused,
    });
  }
});

add_task(async function quickSuggest_items() {
  const TEST_DATA = [
    {
      first: [1, 2],
      second: ["one", "two"],
      expectedReused: true,
    },
    {
      first: [1, 2],
      second: ["one", "two", "three"],
      expectedReused: false,
    },
  ];

  for (let { first, second, expectedReused } of TEST_DATA) {
    await doTest({
      firstProvider: new UrlbarTestUtils.TestProvider({
        name: UrlbarProviderQuickSuggest.name,
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: "testDynamic",
              items: first,
              value: "first provider",
            },
          }),
        ],
        getViewTemplate: SIMPLE_GET_VIEW_TEMPLATE,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      secondProvider: new UrlbarTestUtils.TestProvider({
        name: UrlbarProviderQuickSuggest.name,
        results: [
          makeDynamicResult({
            payload: {
              dynamicType: "testDynamic",
              items: second,
              value: "second provider",
            },
          }),
        ],
        getViewTemplate: SIMPLE_GET_VIEW_TEMPLATE,
        getViewUpdate: SIMPLE_GET_VIEW_UPDATE,
      }),
      expectedReused,
    });
  }
});

function makeDynamicResult(override) {
  return new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.DYNAMIC,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    suggestedIndex: 0,
    ...override,
  });
}

function makeUrlResult(override) {
  return new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    suggestedIndex: 0,
    ...override,
  });
}

function makeTipResult(override) {
  return new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.TIP,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    suggestedIndex: 0,
    ...override,
  });
}

async function doTest({
  firstProvider,
  secondProvider,
  expectedReused,
  expectedButtons = null,
}) {
  info("Show the results of first provider");
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(firstProvider);
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "any",
  });

  info("Hold the row element and its _elements");
  let { row: firstShownRow } = (
    await UrlbarTestUtils.getDetailsOfResultAt(window, 0)
  ).element;
  let firstShownContent = firstShownRow._content;
  let firstShownButtons = new Map(firstShownRow._buttons);
  let firstShownButtonsElement = firstShownRow._elements.get("buttons");
  let firstShownButtonsFirstElement =
    firstShownButtonsElement?.firstElementChild;
  providersManager.unregisterProvider(firstProvider);
  if (expectedButtons) {
    info("Sanity check for buttons");
    assertButtons(
      firstShownButtons,
      firstShownButtonsElement,
      expectedButtons.first
    );
  }

  info("Show the results of second provider");
  providersManager.registerProvider(secondProvider);
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "any",
  });

  info("Check that the element is reused");
  let { row: secondShownRow } = (
    await UrlbarTestUtils.getDetailsOfResultAt(window, 0)
  ).element;

  info("Assert results");
  let isContentReused =
    firstShownRow == secondShownRow &&
    firstShownContent == secondShownRow._content &&
    firstShownContent.firstElementChild ==
      secondShownRow._content.firstElementChild;

  if (expectedButtons) {
    info("Assert buttons");
    Assert.ok(
      isContentReused,
      "The content element should be reused if the changes was only buttons"
    );

    let secondShownButtons = secondShownRow._buttons;
    let secondShownButtonsElement = secondShownRow._elements.get("buttons");
    let secondShownButtonsFirstElement =
      secondShownButtonsElement.firstElementChild;
    Assert.equal(
      firstShownButtonsFirstElement == secondShownButtonsFirstElement,
      expectedReused,
      "Check whether the buttons element is reused or not"
    );

    assertButtons(
      secondShownButtons,
      secondShownButtonsElement,
      expectedButtons.second
    );
  } else {
    info("Assert content");
    Assert.equal(
      isContentReused,
      expectedReused,
      "Check whether the content element is reused or not"
    );
  }

  providersManager.unregisterProvider(secondProvider);
  await UrlbarTestUtils.promiseSearchComplete(window);
}

function assertButtons(buttonsMap, buttonsElement, expected) {
  Assert.equal([...buttonsMap.keys()].length, expected.length);
  for (let name of expected) {
    let button = buttonsMap.get(name);
    Assert.ok(button);
    Assert.ok(buttonsElement.contains(button));
  }
}
