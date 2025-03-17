/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const {
  DEFAULT_UNLOAD_TIMEOUT,
  getUnloadTimeoutMultiplier,
  ProgressListener,
  waitForInitialNavigationCompleted,
} = ChromeUtils.importESModule(
  "chrome://remote/content/shared/Navigate.sys.mjs"
);

const LOAD_FLAG_ERROR_PAGE = 0x10000;

const CURRENT_URI = Services.io.newURI("http://foo.bar/");
const INITIAL_URI = Services.io.newURI("about:blank");
const TARGET_URI = Services.io.newURI("http://foo.cheese/");
const TARGET_URI_ERROR_PAGE = Services.io.newURI("doesnotexist://");
const TARGET_URI_WITH_HASH = Services.io.newURI("http://foo.cheese/#foo");

function wait(time) {
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  return new Promise(resolve => setTimeout(resolve, time));
}

class MockRequest {
  constructor(uri) {
    this.originalURI = uri;
  }

  get QueryInterface() {
    return ChromeUtils.generateQI(["nsIRequest", "nsIChannel"]);
  }
}

class MockWebProgress {
  constructor(browsingContext) {
    this.browsingContext = browsingContext;

    this.documentRequest = null;
    this.isLoadingDocument = false;
    this.listener = null;
    this.loadType = 0;
    this.progressListenerRemoved = false;
  }

  addProgressListener(listener) {
    if (this.listener) {
      throw new Error("Cannot register listener twice");
    }

    this.listener = listener;
  }

  removeProgressListener(listener) {
    if (listener === this.listener) {
      this.listener = null;
      this.progressListenerRemoved = true;
    } else {
      throw new Error("Unknown listener");
    }
  }

  sendLocationChange(options = {}) {
    const { flag = 0 } = options;

    this.documentRequest = null;

    if (flag & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
      this.browsingContext.updateURI(TARGET_URI_WITH_HASH);
    } else if (flag & Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE) {
      this.browsingContext.updateURI(TARGET_URI_ERROR_PAGE, true);
    }

    this.listener?.onLocationChange(
      this,
      this.documentRequest,
      this.browsingContext.currentURI,
      flag
    );

    return new Promise(executeSoon);
  }

  sendStartState(options = {}) {
    const { coop = false, isInitial = false } = options;

    if (coop) {
      this.browsingContext = new MockTopContext(this);
    }

    if (!this.browsingContext.currentWindowGlobal) {
      this.browsingContext.currentWindowGlobal = {};
    }

    this.browsingContext.currentWindowGlobal.isInitialDocument = isInitial;

    this.isLoadingDocument = true;
    this.loadType = 0;
    const uri = isInitial ? INITIAL_URI : TARGET_URI;
    this.documentRequest = new MockRequest(uri);

    this.listener?.onStateChange(
      this,
      this.documentRequest,
      Ci.nsIWebProgressListener.STATE_START,
      0
    );

    return new Promise(executeSoon);
  }

  sendStopState(options = {}) {
    const { flag = 0, loadType = 0 } = options;

    this.browsingContext.currentURI = this.documentRequest.originalURI;

    this.isLoadingDocument = false;
    this.documentRequest = null;

    this.listener?.onStateChange(
      this,
      this.documentRequest,
      Ci.nsIWebProgressListener.STATE_STOP,
      flag
    );

    if (loadType & LOAD_FLAG_ERROR_PAGE) {
      this.loadType = 0x10000;
      return this.sendLocationChange({
        flag: Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE,
      });
    }

    return new Promise(executeSoon);
  }
}

class MockTopContext {
  constructor(webProgress = null) {
    this.currentURI = CURRENT_URI;
    this.currentWindowGlobal = {
      isInitialDocument: true,
      documentURI: CURRENT_URI,
    };
    this.id = 7;
    this.top = this;
    this.webProgress = webProgress || new MockWebProgress(this);
  }

  updateURI(uri, isError = false) {
    this.currentURI = uri;
    if (isError) {
      this.currentWindowGlobal.documentURI = "about:neterror?e=errorMessage";
    } else {
      this.currentWindowGlobal.documentURI = uri;
    }
  }
}

const hasPromiseResolved = async function (promise) {
  let resolved = false;
  promise.finally(() => (resolved = true));
  // Make sure microtasks have time to run.
  await new Promise(resolve => Services.tm.dispatchToMainThread(resolve));
  return resolved;
};

const hasPromiseRejected = async function (promise) {
  let rejected = false;
  promise.catch(() => (rejected = true));
  // Make sure microtasks have time to run.
  await new Promise(resolve => Services.tm.dispatchToMainThread(resolve));
  return rejected;
};

add_task(
  async function test_waitForInitialNavigation_initialDocumentNoWindowGlobal() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    // In some cases there might be no window global yet.
    delete browsingContext.currentWindowGlobal;

    ok(!webProgress.isLoadingDocument, "Document is not loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);
    await webProgress.sendStartState({ isInitial: true });

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    await webProgress.sendStopState();
    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
      "Is initial document"
    );
    equal(
      currentURI.spec,
      INITIAL_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, INITIAL_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_initialDocumentNotLoaded() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    ok(!webProgress.isLoadingDocument, "Document is not loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);

    await webProgress.sendStartState({ isInitial: true });

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    await webProgress.sendStopState();
    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
      "Is initial document"
    );
    equal(
      currentURI.spec,
      INITIAL_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, INITIAL_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_initialDocumentLoadingAndNoAdditionalLoad() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    await webProgress.sendStartState({ isInitial: true });
    ok(webProgress.isLoadingDocument, "Document is loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    await webProgress.sendStopState();
    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
      "Is initial document"
    );
    equal(
      currentURI.spec,
      INITIAL_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, INITIAL_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_initialDocumentFinishedLoadingNoAdditionalLoad() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    await webProgress.sendStartState({ isInitial: true });
    await webProgress.sendStopState();

    ok(!webProgress.isLoadingDocument, "Document is not loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
      "Is initial document"
    );
    equal(
      currentURI.spec,
      INITIAL_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, INITIAL_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_initialDocumentLoadingAndAdditionalLoad() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    await webProgress.sendStartState({ isInitial: true });

    ok(webProgress.isLoadingDocument, "Document is loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    await webProgress.sendStopState();

    await wait(100);

    await webProgress.sendStartState({ isInitial: false });
    await webProgress.sendStopState();

    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      !webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
      "Is not initial document"
    );
    equal(
      currentURI.spec,
      TARGET_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, TARGET_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_initialDocumentFinishedLoadingAndAdditionalLoad() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    await webProgress.sendStartState({ isInitial: true });
    await webProgress.sendStopState();

    ok(!webProgress.isLoadingDocument, "Document is not loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    await wait(100);

    await webProgress.sendStartState({ isInitial: false });
    await webProgress.sendStopState();

    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      !webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
      "Is not initial document"
    );
    equal(
      currentURI.spec,
      TARGET_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, TARGET_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_notInitialDocumentNotLoading() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    ok(!webProgress.isLoadingDocument, "Document is not loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);
    await webProgress.sendStartState({ isInitial: false });

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    await webProgress.sendStopState();
    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      !browsingContext.currentWindowGlobal.isInitialDocument,
      "Is not initial document"
    );
    equal(
      currentURI.spec,
      TARGET_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, TARGET_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_notInitialDocumentAlreadyLoading() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    await webProgress.sendStartState({ isInitial: false });
    ok(webProgress.isLoadingDocument, "Document is loading");

    const navigated = waitForInitialNavigationCompleted(webProgress);

    ok(
      !(await hasPromiseResolved(navigated)),
      "waitForInitialNavigationCompleted has not resolved yet"
    );

    await webProgress.sendStopState();
    const { currentURI, targetURI } = await navigated;

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      !browsingContext.currentWindowGlobal.isInitialDocument,
      "Is not initial document"
    );
    equal(
      currentURI.spec,
      TARGET_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, TARGET_URI.spec, "Expected target URI has been set");
  }
);

add_task(
  async function test_waitForInitialNavigation_notInitialDocumentFinishedLoading() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    await webProgress.sendStartState({ isInitial: false });
    await webProgress.sendStopState();

    ok(!webProgress.isLoadingDocument, "Document is not loading");

    const { currentURI, targetURI } = await waitForInitialNavigationCompleted(
      webProgress
    );

    ok(!webProgress.isLoadingDocument, "Document is not loading");
    ok(
      !webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
      "Is not initial document"
    );
    equal(
      currentURI.spec,
      TARGET_URI.spec,
      "Expected current URI has been set"
    );
    equal(targetURI.spec, TARGET_URI.spec, "Expected target URI has been set");
  }
);

add_task(async function test_waitForInitialNavigation_resolveWhenStarted() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  await webProgress.sendStartState({ isInitial: true });
  ok(webProgress.isLoadingDocument, "Document is already loading");

  const { currentURI, targetURI } = await waitForInitialNavigationCompleted(
    webProgress,
    {
      resolveWhenStarted: true,
    }
  );

  ok(webProgress.isLoadingDocument, "Document is still loading");
  ok(
    webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
    "Is initial document"
  );
  equal(currentURI.spec, CURRENT_URI.spec, "Expected current URI has been set");
  equal(targetURI.spec, INITIAL_URI.spec, "Expected target URI has been set");
});

add_task(async function test_waitForInitialNavigation_crossOrigin() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  ok(!webProgress.isLoadingDocument, "Document is not loading");

  const navigated = waitForInitialNavigationCompleted(webProgress);
  await webProgress.sendStartState({ coop: true });

  ok(
    !(await hasPromiseResolved(navigated)),
    "waitForInitialNavigationCompleted has not resolved yet"
  );

  await webProgress.sendStopState();
  const { currentURI, targetURI } = await navigated;

  notEqual(
    browsingContext,
    webProgress.browsingContext,
    "Got new browsing context"
  );
  ok(!webProgress.isLoadingDocument, "Document is not loading");
  ok(
    !webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
    "Is not initial document"
  );
  equal(currentURI.spec, TARGET_URI.spec, "Expected current URI has been set");
  equal(targetURI.spec, TARGET_URI.spec, "Expected target URI has been set");
});

add_task(async function test_waitForInitialNavigation_unloadTimeout_default() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  // Stop the navigation on an initial page which is not loading anymore.
  // This situation happens with new tabs on Android, even though they are on
  // the initial document, they will not start another navigation on their own.
  await webProgress.sendStartState({ isInitial: true });
  await webProgress.sendStopState();

  ok(!webProgress.isLoadingDocument, "Document is not loading");

  const navigated = waitForInitialNavigationCompleted(webProgress);

  // Start a timer longer than the timeout which will be used by
  // waitForInitialNavigationCompleted, and check that navigated resolves first.
  const waitForMoreThanDefaultTimeout = wait(
    DEFAULT_UNLOAD_TIMEOUT * 1.5 * getUnloadTimeoutMultiplier()
  );
  await Promise.race([navigated, waitForMoreThanDefaultTimeout]);

  ok(
    await hasPromiseResolved(navigated),
    "waitForInitialNavigationCompleted has resolved"
  );

  ok(!webProgress.isLoadingDocument, "Document is not loading");
  ok(
    webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
    "Document is still on the initial document"
  );
});

add_task(async function test_waitForInitialNavigation_unloadTimeout_longer() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  // Stop the navigation on an initial page which is not loading anymore.
  // This situation happens with new tabs on Android, even though they are on
  // the initial document, they will not start another navigation on their own.
  await webProgress.sendStartState({ isInitial: true });
  await webProgress.sendStopState();

  ok(!webProgress.isLoadingDocument, "Document is not loading");

  const navigated = waitForInitialNavigationCompleted(webProgress, {
    unloadTimeout: DEFAULT_UNLOAD_TIMEOUT * 3,
  });

  // Start a timer longer than the default timeout of the Navigate module.
  // However here we used a custom timeout, so we expect that the navigation
  // will not be done yet by the time this timer is done.
  const waitForMoreThanDefaultTimeout = wait(
    DEFAULT_UNLOAD_TIMEOUT * 1.5 * getUnloadTimeoutMultiplier()
  );
  await Promise.race([navigated, waitForMoreThanDefaultTimeout]);

  // The promise should not have resolved because we didn't reached the custom
  // timeout which is 3 times the default one.
  ok(
    !(await hasPromiseResolved(navigated)),
    "waitForInitialNavigationCompleted has not resolved yet"
  );

  // The navigation should eventually resolve once we reach the custom timeout.
  await navigated;

  ok(!webProgress.isLoadingDocument, "Document is not loading");
  ok(
    webProgress.browsingContext.currentWindowGlobal.isInitialDocument,
    "Document is still on the initial document"
  );
});

add_task(async function test_ProgressListener_expectNavigation() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  const progressListener = new ProgressListener(webProgress, {
    expectNavigation: true,
    unloadTimeout: 10,
  });
  const navigated = progressListener.start();

  // Wait for unloadTimeout to finish in case it started
  await wait(30);

  ok(!(await hasPromiseResolved(navigated)), "Listener has not resolved yet");

  await webProgress.sendStartState();
  await webProgress.sendStopState();

  ok(await hasPromiseResolved(navigated), "Listener has resolved");
});

add_task(
  async function test_ProgressListener_expectNavigation_initialDocumentFinishedLoading() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    const progressListener = new ProgressListener(webProgress, {
      expectNavigation: true,
      unloadTimeout: 10,
    });
    const navigated = progressListener.start();

    ok(!(await hasPromiseResolved(navigated)), "Listener has not resolved yet");

    await webProgress.sendStartState({ isInitial: true });
    await webProgress.sendStopState();

    // Wait for unloadTimeout to finish in case it started
    await wait(30);

    ok(!(await hasPromiseResolved(navigated)), "Listener has not resolved yet");

    await webProgress.sendStartState();
    await webProgress.sendStopState();

    ok(await hasPromiseResolved(navigated), "Listener has resolved");
  }
);

add_task(async function test_ProgressListener_isStarted() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  const progressListener = new ProgressListener(webProgress);
  ok(!progressListener.isStarted);

  progressListener.start();
  ok(progressListener.isStarted);

  progressListener.stop();
  ok(!progressListener.isStarted);
});

add_task(async function test_ProgressListener_notWaitForExplicitStart() {
  // Create a webprogress and start it before creating the progress listener.
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;
  await webProgress.sendStartState();

  // Create the progress listener for a webprogress already in a navigation.
  const progressListener = new ProgressListener(webProgress, {
    waitForExplicitStart: false,
  });
  const navigated = progressListener.start();

  // Send stop state to complete the initial navigation
  await webProgress.sendStopState();
  ok(
    await hasPromiseResolved(navigated),
    "Listener has resolved after initial navigation"
  );
});

add_task(async function test_ProgressListener_waitForExplicitStart() {
  // Create a webprogress and start it before creating the progress listener.
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;
  await webProgress.sendStartState();

  // Create the progress listener for a webprogress already in a navigation.
  const progressListener = new ProgressListener(webProgress, {
    waitForExplicitStart: true,
  });
  const navigated = progressListener.start();

  // Send stop state to complete the initial navigation
  await webProgress.sendStopState();
  ok(
    !(await hasPromiseResolved(navigated)),
    "Listener has not resolved after initial navigation"
  );

  // Start a new navigation
  await webProgress.sendStartState();
  ok(
    !(await hasPromiseResolved(navigated)),
    "Listener has not resolved after starting new navigation"
  );

  // Finish the new navigation
  await webProgress.sendStopState();
  ok(
    await hasPromiseResolved(navigated),
    "Listener resolved after finishing the new navigation"
  );
});

add_task(
  async function test_ProgressListener_waitForExplicitStartAndResolveWhenStarted() {
    // Create a webprogress and start it before creating the progress listener.
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;
    await webProgress.sendStartState();

    // Create the progress listener for a webprogress already in a navigation.
    const progressListener = new ProgressListener(webProgress, {
      resolveWhenStarted: true,
      waitForExplicitStart: true,
    });
    const navigated = progressListener.start();

    // Send stop state to complete the initial navigation
    await webProgress.sendStopState();
    ok(
      !(await hasPromiseResolved(navigated)),
      "Listener has not resolved after initial navigation"
    );

    // Start a new navigation
    await webProgress.sendStartState();
    ok(
      await hasPromiseResolved(navigated),
      "Listener resolved after starting the new navigation"
    );
  }
);

add_task(
  async function test_ProgressListener_resolveWhenNavigatingInsideDocument() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    const progressListener = new ProgressListener(webProgress);
    const navigated = progressListener.start();

    ok(!(await hasPromiseResolved(navigated)), "Listener has not resolved");

    // Send hash change location change notification to complete the navigation
    await webProgress.sendLocationChange({
      flag: Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT,
    });

    ok(await hasPromiseResolved(navigated), "Listener has resolved");

    const { currentURI, targetURI } = progressListener;
    equal(
      currentURI.spec,
      TARGET_URI_WITH_HASH.spec,
      "Expected current URI has been set"
    );
    equal(
      targetURI.spec,
      TARGET_URI_WITH_HASH.spec,
      "Expected target URI has been set"
    );
  }
);

add_task(async function test_ProgressListener_ignoreCacheError() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  const progressListener = new ProgressListener(webProgress);
  const navigated = progressListener.start();

  ok(!(await hasPromiseResolved(navigated)), "Listener has not resolved");

  await webProgress.sendStartState();
  await webProgress.sendStopState({
    flag: Cr.NS_ERROR_PARSED_DATA_CACHED,
  });

  ok(await hasPromiseResolved(navigated), "Listener has resolved");
});

add_task(async function test_ProgressListener_navigationRejectedOnErrorPage() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  const progressListener = new ProgressListener(webProgress, {
    waitForExplicitStart: false,
  });
  const navigated = progressListener.start();

  await webProgress.sendStartState();
  await webProgress.sendLocationChange({
    flag:
      Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT |
      Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE,
  });

  ok(
    await hasPromiseRejected(navigated),
    "Listener has rejected in location change for error page"
  );
});

add_task(
  async function test_ProgressListener_navigationRejectedOnStopStateErrorPage() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    const progressListener = new ProgressListener(webProgress, {
      waitForExplicitStart: false,
    });
    const navigated = progressListener.start();

    await webProgress.sendStartState();
    await webProgress.sendStopState({
      flag: Cr.NS_ERROR_MALWARE_URI,
      loadType: LOAD_FLAG_ERROR_PAGE,
    });

    ok(
      await hasPromiseRejected(navigated),
      "Listener has rejected in stop state for erroneous navigation"
    );
  }
);

add_task(
  async function test_ProgressListener_navigationRejectedOnStopStateAndAborted() {
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;

    for (const flag of [Cr.NS_BINDING_ABORTED, Cr.NS_ERROR_ABORT]) {
      const progressListener = new ProgressListener(webProgress, {
        waitForExplicitStart: false,
      });
      const navigated = progressListener.start();

      await webProgress.sendStartState();
      await webProgress.sendStopState({ flag });

      ok(
        await hasPromiseRejected(navigated),
        "Listener has rejected in stop state for erroneous navigation"
      );
    }
  }
);

add_task(async function test_ProgressListener_stopIfStarted() {
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;

  const progressListener = new ProgressListener(webProgress);
  const navigated = progressListener.start();

  progressListener.stopIfStarted();
  ok(!(await hasPromiseResolved(navigated)), "Listener has not resolved");

  await webProgress.sendStartState();
  progressListener.stopIfStarted();
  ok(await hasPromiseResolved(navigated), "Listener has resolved");
});

add_task(async function test_ProgressListener_stopIfStarted_alreadyStarted() {
  // Create an already navigating browsing context.
  const browsingContext = new MockTopContext();
  const webProgress = browsingContext.webProgress;
  await webProgress.sendStartState();

  // Create a progress listener which accepts already ongoing navigations.
  const progressListener = new ProgressListener(webProgress, {
    waitForExplicitStart: false,
  });
  const navigated = progressListener.start();

  // stopIfStarted should stop the listener because of the ongoing navigation.
  progressListener.stopIfStarted();
  ok(await hasPromiseResolved(navigated), "Listener has resolved");
});

add_task(
  async function test_ProgressListener_stopIfStarted_alreadyStarted_waitForExplicitStart() {
    // Create an already navigating browsing context.
    const browsingContext = new MockTopContext();
    const webProgress = browsingContext.webProgress;
    await webProgress.sendStartState();

    // Create a progress listener which rejects already ongoing navigations.
    const progressListener = new ProgressListener(webProgress, {
      waitForExplicitStart: true,
    });
    const navigated = progressListener.start();

    // stopIfStarted will not stop the listener for the existing navigation.
    progressListener.stopIfStarted();
    ok(!(await hasPromiseResolved(navigated)), "Listener has not resolved");

    // stopIfStarted will stop the listener when called after starting a new
    // navigation.
    await webProgress.sendStartState();
    progressListener.stopIfStarted();
    ok(await hasPromiseResolved(navigated), "Listener has resolved");
  }
);
