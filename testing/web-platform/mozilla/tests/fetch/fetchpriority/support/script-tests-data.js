const kFetchPriorityLowRequestFileNameAndSuffix = "dummy.js?1";
const kFetchPriorityHighRequestFileNameAndSuffix = "dummy.js?2";
const kFetchPriorityAutoRequestFileNameAndSuffix = "dummy.js?3";
const kNoFetchPriorityRequestFileNameAndSuffix = "dummy.js?4";

// Mapping fetchpriority's values to internal priorities is specified as
// implementation-defined (https://fetch.spec.whatwg.org/#concept-fetch, step
// 15). For web-compatibility, Chromium's desired mapping is chosen, see
// <https://web.dev/articles/fetch-priority#browser_priority_and_fetchpriority>.
// Exceptions are commented below.

const kExpectedRequestsForScriptsInHead = [
    {   fileNameAndSuffix: kFetchPriorityLowRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_LOW
    },
    {   fileNameAndSuffix: kFetchPriorityHighRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_HIGH
    },
    {   fileNameAndSuffix: kFetchPriorityAutoRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: kNoFetchPriorityRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    }
];

const kExpectedRequestsForScriptsInHeadDisabled = [
    {   fileNameAndSuffix: kFetchPriorityLowRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: kFetchPriorityHighRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: kFetchPriorityAutoRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: kNoFetchPriorityRequestFileNameAndSuffix,
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    }
];

// TODO(bug 1872654): Should we align on Chromium for "early" in-body scripts?
const kExpectedRequestsForScriptsInBody = [
    {   fileNameAndSuffix: "dummy.js?1",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_LOW
    },
    {   fileNameAndSuffix: "dummy.js?2",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_HIGH
    },
    {   fileNameAndSuffix: "dummy.js?3",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?4",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?5",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?6",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?7",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?8",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?9",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_LOW
    },
    {   fileNameAndSuffix: "dummy.js?10",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_HIGH
    },
    {   fileNameAndSuffix: "dummy.js?11",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?12",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?13",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?14",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?15",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?16",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
]

const kExpectedRequestsForScriptsInBodyDisabled = [
    {   fileNameAndSuffix: "dummy.js?1",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?2",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?3",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?4",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?5",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?6",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?7",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?8",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?9",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?10",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?11",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?12",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?13",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?14",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?15",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?16",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
]

export const kTestFolderName = "script-tests";

const kExpectedRequestsForNonModuleAsyncAndDeferredScripts = [
    {   fileNameAndSuffix: "dummy.js?1",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_LOW
    },
    {   fileNameAndSuffix: "dummy.js?2",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_HIGH
    },
    {   fileNameAndSuffix: "dummy.js?3",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?4",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?5",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?6",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?7",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?8",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
]

const kExpectedRequestsForNonModuleAsyncAndDeferredScriptsDisabled = [
    {   fileNameAndSuffix: "dummy.js?1",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?2",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?3",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?4",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?5",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?6",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?7",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?8",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
]

// Chromium's desired behavior is under discussion:
// <https://bugs.chromium.org/p/chromium/issues/detail?id=1475635>.
const kExpectedRequestsForModuleScripts = [
    {   fileNameAndSuffix: "dummy.js?1",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_LOW
    },
    {   fileNameAndSuffix: "dummy.js?2",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_HIGH
    },
    {   fileNameAndSuffix: "dummy.js?3",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?4",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?5",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?6",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?7",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?8",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
]

const kExpectedRequestsForModuleScriptsDisabled = [
    {   fileNameAndSuffix: "dummy.js?1",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?2",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?3",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?4",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?5",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?6",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?7",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
    {   fileNameAndSuffix: "dummy.js?8",
        internalPriority: SpecialPowers.Ci.nsISupportsPriority.PRIORITY_NORMAL
    },
]

export const kTestData = [
    {   testFileName: "script-initial-load-head.h2.html",
        expectedRequests: kExpectedRequestsForScriptsInHead
    },
    {   testFileName: "script-initial-load-body.h2.html",
        expectedRequests: kExpectedRequestsForScriptsInBody
    },
    {   testFileName: "async-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForNonModuleAsyncAndDeferredScripts
    },
    {   testFileName: "deferred-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForNonModuleAsyncAndDeferredScripts
    },
    {   testFileName: "module-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForModuleScripts
    },
    {   testFileName: "async-module-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForModuleScripts
    },
    // Dynamic insertion executes non-speculative-parsing
    // (https://developer.mozilla.org/en-US/docs/Glossary/speculative_parsing)
    // code paths. Moreover such inserted scripts are loaded asynchronously.
    {   testFileName: "script-dynamic-insertion.h2.html",
        expectedRequests: kExpectedRequestsForNonModuleAsyncAndDeferredScripts
    },
    {   testFileName: "module-script-dynamic-insertion.h2.html",
        expectedRequests: kExpectedRequestsForModuleScripts
    }
];

export const kTestDataDisabled = [
    {   testFileName: "script-initial-load-head.h2.html",
        expectedRequests: kExpectedRequestsForScriptsInHeadDisabled
    },
    {   testFileName: "script-initial-load-body.h2.html",
        expectedRequests: kExpectedRequestsForScriptsInBodyDisabled
    },
    {   testFileName: "async-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForNonModuleAsyncAndDeferredScriptsDisabled
    },
    {   testFileName: "deferred-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForNonModuleAsyncAndDeferredScriptsDisabled
    },
    {   testFileName: "module-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForModuleScriptsDisabled
    },
    {   testFileName: "async-module-script-initial-load.h2.html",
        expectedRequests: kExpectedRequestsForModuleScriptsDisabled
    },
    {   testFileName: "script-dynamic-insertion.h2.html",
        expectedRequests: kExpectedRequestsForNonModuleAsyncAndDeferredScriptsDisabled
    },
    {   testFileName: "module-script-dynamic-insertion.h2.html",
        expectedRequests: kExpectedRequestsForModuleScriptsDisabled
    }
];
