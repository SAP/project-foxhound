/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { openToolboxAndLog, reloadPageAndLog } = require("../head");
const {
  createLocation,
} = require("devtools/client/debugger/src/utils/location");

/*
 * These methods are used for working with debugger state changes in order
 * to make it easier to manipulate the ui and test different behavior. These
 * methods roughly reflect those found in debugger/test/mochi/head.js with
 * a few exceptions. The `dbg` object is not exactly the same, and the methods
 * have been simplified. We may want to consider unifying them in the future
 */

const DEBUGGER_POLLING_INTERVAL = 25;

function waitForState(dbg, predicate, msg) {
  return new Promise(resolve => {
    if (msg) {
      dump(`Waiting for state change: ${msg}\n`);
    }
    if (predicate(dbg.store.getState())) {
      if (msg) {
        dump(`Finished waiting for state change: ${msg}\n`);
      }
      return resolve();
    }

    const unsubscribe = dbg.store.subscribe(() => {
      if (predicate(dbg.store.getState())) {
        if (msg) {
          dump(`Finished waiting for state change: ${msg}\n`);
        }
        unsubscribe();
        resolve();
      }
    });
    return false;
  });
}
exports.waitForState = waitForState;

function waitForDispatch(dbg, type, count = 1) {
  return new Promise(resolve => {
    dbg.store.dispatch({
      type: "@@service/waitUntil",
      predicate: action => {
        if (
          action.type === type &&
          (!action.status ||
            action.status === "done" ||
            action.status === "error")
        ) {
          --count;
          if (count === 0) {
            return true;
          }
        }
        return false;
      },
      run: (dispatch, getState, action) => {
        resolve(action);
      },
    });
  });
}

async function waitUntil(predicate, msg) {
  if (msg) {
    dump(`Waiting until: ${msg}\n`);
  }
  const earlyPredicateResult = predicate();
  if (earlyPredicateResult) {
    if (msg) {
      dump(`Finished Waiting until: ${msg} (was immediately true)\n`);
    }
    return earlyPredicateResult;
  }
  return new Promise(resolve => {
    const timer = setInterval(() => {
      const predicateResult = predicate();
      if (predicateResult) {
        clearInterval(timer);
        if (msg) {
          dump(`Finished Waiting until: ${msg}\n`);
        }
        resolve(predicateResult);
      }
    }, DEBUGGER_POLLING_INTERVAL);
  });
}
exports.waitUntil = waitUntil;

function findSource(dbg, url) {
  const sources = dbg.selectors.getSourceList(dbg.getState());
  return sources.find(s => (s.url || "").includes(url));
}
exports.findSource = findSource;

function getCM(dbg) {
  const el = dbg.win.document.querySelector(".CodeMirror");
  return el.CodeMirror;
}
exports.getCM = getCM;

function waitForText(dbg, text) {
  return waitUntil(() => {
    // the welcome box is removed once text is displayed
    const welcomebox = dbg.win.document.querySelector(".welcomebox");
    if (welcomebox) {
      return false;
    }
    const cm = getCM(dbg);
    const editorText = cm.doc.getValue();
    return editorText.includes(text);
  }, "text is visible");
}
exports.waitForText = waitForText;

function waitForSymbols(dbg) {
  return waitUntil(() => {
    const state = dbg.store.getState();
    const location = dbg.selectors.getSelectedLocation(state);
    return dbg.selectors.getSymbols(state, location);
  }, "has file metadata");
}

function waitForSources(dbg, expectedSources) {
  const { selectors } = dbg;
  function countSources(state) {
    return selectors.getSourceCount(state) >= expectedSources;
  }
  return waitForState(dbg, countSources, "count sources");
}

function waitForSource(dbg, sourceURL) {
  const { selectors } = dbg;
  function hasSource(state) {
    return selectors.getSourceByURL(state, sourceURL);
  }
  return waitForState(dbg, hasSource, `has source ${sourceURL}`);
}
exports.waitForSource = waitForSource;

function waitForThreadCount(dbg, count) {
  const { selectors } = dbg;
  function threadCount(state) {
    // getThreads doesn't count the main thread
    // and don't use getAllThreads as it does useless expensive computations.
    return selectors.getThreads(state).length + 1 == count;
  }
  return waitForState(dbg, threadCount, `has source ${count} threads`);
}

async function waitForPaused(
  dbg,
  pauseOptions = { shouldWaitForLoadedScopes: true }
) {
  const promises = [];

  // If original variable mapping is disabled the scopes for
  // original sources are not loaded by default so lets not
  // wait for any scopes.
  if (pauseOptions.shouldWaitForLoadedScopes) {
    promises.push(waitForLoadedScopes(dbg));
  }
  const {
    selectors: { getSelectedScope, getIsPaused, getCurrentThread },
  } = dbg;
  const onStateChange = waitForState(dbg, state => {
    const thread = getCurrentThread(state);
    return getSelectedScope(state, thread) && getIsPaused(state, thread);
  });
  promises.push(onStateChange);
  return Promise.all(promises);
}
exports.waitForPaused = waitForPaused;

async function waitForResumed(dbg) {
  const {
    selectors: { getIsPaused, getCurrentThread },
  } = dbg;
  return waitForState(
    dbg,
    state => !getIsPaused(state, getCurrentThread(state))
  );
}

async function waitForElement(dbg, name) {
  await waitUntil(() => dbg.win.document.querySelector(name));
  return dbg.win.document.querySelector(name);
}

async function waitForLoadedScopes(dbg) {
  // Since scopes auto-expand, we can assume they are loaded when there is a tree node
  // with the aria-level attribute equal to "2".
  const element = '.scopes-list .tree-node[aria-level="2"]';
  return waitForElement(dbg, element);
}

function clickElement(dbg, selector) {
  const clickEvent = new dbg.win.MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: dbg.win,
  });
  dbg.win.document.querySelector(selector).dispatchEvent(clickEvent);
}

async function toggleOriginalScopes(dbg) {
  const scopesLoaded = waitForLoadedScopes(dbg);
  const onDispatch = waitForDispatch(dbg, "TOGGLE_MAP_SCOPES");
  clickElement(dbg, ".map-scopes-header input");
  return Promise.all([onDispatch, scopesLoaded]);
}

function createContext(panel) {
  const { store, selectors, actions } = panel.getVarsForTests();

  return {
    actions,
    selectors,
    getState: store.getState,
    win: panel.panelWin,
    store,
  };
}
exports.createContext = createContext;

async function selectSource(dbg, url) {
  dump(`Selecting source: ${url}\n`);
  const line = 1;
  const source = findSource(dbg, url);
  // keepContext set to false allows to force selecting original/generated source
  // regardless if we were currently selecting the opposite type of source.
  await dbg.actions.selectLocation(createLocation({ source, line }), {
    keepContext: false,
  });
  return waitForState(
    dbg,
    state => {
      const location = dbg.selectors.getSelectedLocation(state);
      if (!location) {
        return false;
      }
      if (location.source != source || location.line != line) {
        return false;
      }
      const sourceTextContent =
        dbg.selectors.getSelectedSourceTextContent(state);
      if (!sourceTextContent) {
        return false;
      }

      // wait for symbols -- a flat map of all named variables in a file -- to be calculated.
      // this is a slow process and becomes slower the larger the file is
      return dbg.selectors.getSymbols(state, location);
    },
    "selected source"
  );
}
exports.selectSource = selectSource;

function evalInFrame(tab, testFunction) {
  dump(`Run function in content process: ${testFunction}\n`);
  // Load a frame script using a data URI so we can run a script
  // inside of the content process and trigger debugger functionality
  // as needed
  const messageManager = tab.linkedBrowser.messageManager;
  return messageManager.loadFrameScript(
    "data:,(" +
      encodeURIComponent(`
        function () {
          const iframe = content.document.querySelector("iframe");
          const win = iframe.contentWindow;
          win.eval(\`${testFunction}\`);
        }`) +
      ")()",
    true
  );
}
exports.evalInFrame = evalInFrame;

async function openDebuggerAndLog(label, expected) {
  const onLoad = async (toolbox, panel) => {
    const dbg = await createContext(panel);
    await waitForThreadCount(dbg, expected.threadsCount);
    await waitForSource(dbg, expected.sourceURL);
    await selectSource(dbg, expected.file);
    await waitForText(dbg, expected.text);
    await waitForSymbols(dbg);
  };

  const toolbox = await openToolboxAndLog(
    label + ".jsdebugger",
    "jsdebugger",
    onLoad
  );
  return toolbox;
}
exports.openDebuggerAndLog = openDebuggerAndLog;

async function reloadDebuggerAndLog(label, toolbox, expected) {
  const onReload = async () => {
    const panel = await toolbox.getPanelWhenReady("jsdebugger");
    const dbg = await createContext(panel);

    // First wait for all previous page threads to be removed
    await waitForDispatch(dbg, "REMOVE_THREAD", expected.threadsCount);
    // Only after that wait for all new threads to be registered before doing more assertions
    // Otherwise we may resolve too soon on previous page sources.
    await waitForThreadCount(dbg, expected.threadsCount);

    await waitForSources(dbg, expected.sources);
    await waitForSource(dbg, expected.sourceURL);
    await waitForText(dbg, expected.text);
    await waitForSymbols(dbg);
  };
  await reloadPageAndLog(`${label}.jsdebugger`, toolbox, onReload);
}
exports.reloadDebuggerAndLog = reloadDebuggerAndLog;

async function addBreakpoint(dbg, line, url) {
  dump(`add breakpoint\n`);
  const source = findSource(dbg, url);
  const location = createLocation({
    source,
    line,
  });

  await selectSource(dbg, url);

  await dbg.actions.addBreakpoint(location);
}
exports.addBreakpoint = addBreakpoint;

async function removeBreakpoints(dbg) {
  dump(`remove all breakpoints\n`);
  const breakpoints = dbg.selectors.getBreakpointsList(dbg.getState());

  const onBreakpointsCleared = waitForState(
    dbg,
    state => dbg.selectors.getBreakpointCount(state) === 0
  );
  await dbg.actions.removeBreakpoints(breakpoints);
  return onBreakpointsCleared;
}
exports.removeBreakpoints = removeBreakpoints;

async function pauseDebugger(dbg, tab, testFunction, { line, file }) {
  const { getSelectedLocation, isMapScopesEnabled } = dbg.selectors;

  const state = dbg.store.getState();
  const selectedSource = getSelectedLocation(state).source;

  await addBreakpoint(dbg, line, file);
  const shouldEnableOriginalScopes =
    selectedSource.isOriginal &&
    !selectedSource.isPrettyPrinted &&
    !isMapScopesEnabled(state);

  const onPaused = waitForPaused(dbg, {
    shouldWaitForLoadedScopes: !shouldEnableOriginalScopes,
  });
  await evalInFrame(tab, testFunction);

  if (shouldEnableOriginalScopes) {
    await onPaused;
    await toggleOriginalScopes(dbg);
  }
  return onPaused;
}
exports.pauseDebugger = pauseDebugger;

async function resume(dbg) {
  const onResumed = waitForResumed(dbg);
  dbg.actions.resume();
  return onResumed;
}
exports.resume = resume;

async function step(dbg, stepType) {
  const resumed = waitForResumed(dbg);
  dbg.actions[stepType]();
  await resumed;
  return waitForPaused(dbg);
}
exports.step = step;

async function hoverOnToken(dbg, textToWaitFor, textToHover) {
  await waitForText(dbg, textToWaitFor);
  const tokenElement = [
    ...dbg.win.document.querySelectorAll(".CodeMirror span"),
  ].find(el => el.textContent === textToHover);

  const mouseOverEvent = new dbg.win.MouseEvent("mouseover", {
    bubbles: true,
    cancelable: true,
    view: dbg.win,
  });
  tokenElement.dispatchEvent(mouseOverEvent);
  const mouseMoveEvent = new dbg.win.MouseEvent("mousemove", {
    bubbles: true,
    cancelable: true,
    view: dbg.win,
  });
  tokenElement.dispatchEvent(mouseMoveEvent);

  // Unfortunately, dispatching mouseover/mousemove manually via MouseEvent
  // isn't enough to toggle the :hover, so manually toggle it.
  // (For some reason, the EventUtils helpers used by mochitests help)
  InspectorUtils.addPseudoClassLock(tokenElement, ":hover", true);

  dump("Waiting for the preview popup to show\n");
  await waitUntil(() =>
    tokenElement.ownerDocument.querySelector(".preview-popup")
  );

  const mouseOutEvent = new dbg.win.MouseEvent("mouseout", {
    bubbles: true,
    cancelable: true,
    view: dbg.win,
  });
  tokenElement.dispatchEvent(mouseOutEvent);

  const mouseMoveOutEvent = new dbg.win.MouseEvent("mousemove", {
    bubbles: true,
    cancelable: true,
    view: dbg.win,
  });
  // See shared-head file, for why picking this element
  const element = tokenElement.ownerDocument.querySelector(
    ".debugger-settings-menu-button"
  );
  element.dispatchEvent(mouseMoveOutEvent);

  InspectorUtils.removePseudoClassLock(tokenElement, ":hover");

  dump("Waiting for the preview popup to hide\n");
  await waitUntil(
    () => !tokenElement.ownerDocument.querySelector(".preview-popup")
  );
}
exports.hoverOnToken = hoverOnToken;
