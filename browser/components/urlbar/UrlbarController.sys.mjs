/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserSearchTelemetry: "resource:///modules/BrowserSearchTelemetry.sys.mjs",
  FormHistory: "resource://gre/modules/FormHistory.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.sys.mjs",
  UrlbarProvidersManager: "resource:///modules/UrlbarProvidersManager.sys.mjs",
  UrlbarTokenizer: "resource:///modules/UrlbarTokenizer.sys.mjs",
  UrlbarUtils: "resource:///modules/UrlbarUtils.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

const TELEMETRY_1ST_RESULT = "PLACES_AUTOCOMPLETE_1ST_RESULT_TIME_MS";
const TELEMETRY_6_FIRST_RESULTS = "PLACES_AUTOCOMPLETE_6_FIRST_RESULTS_TIME_MS";

const TELEMETRY_SCALAR_ENGAGEMENT = "urlbar.engagement";
const TELEMETRY_SCALAR_ABANDONMENT = "urlbar.abandonment";

const NOTIFICATIONS = {
  QUERY_STARTED: "onQueryStarted",
  QUERY_RESULTS: "onQueryResults",
  QUERY_RESULT_REMOVED: "onQueryResultRemoved",
  QUERY_CANCELLED: "onQueryCancelled",
  QUERY_FINISHED: "onQueryFinished",
  VIEW_OPEN: "onViewOpen",
  VIEW_CLOSE: "onViewClose",
};

/**
 * The address bar controller handles queries from the address bar, obtains
 * results and returns them to the UI for display.
 *
 * Listeners may be added to listen for the results. They may support the
 * following methods which may be called when a query is run:
 *
 * - onQueryStarted(queryContext)
 * - onQueryResults(queryContext)
 * - onQueryCancelled(queryContext)
 * - onQueryFinished(queryContext)
 * - onQueryResultRemoved(index)
 * - onViewOpen()
 * - onViewClose()
 */
export class UrlbarController {
  /**
   * Initialises the class. The manager may be overridden here, this is for
   * test purposes.
   *
   * @param {object} options
   *   The initial options for UrlbarController.
   * @param {UrlbarInput} options.input
   *   The input this controller is operating with.
   * @param {object} [options.manager]
   *   Optional fake providers manager to override the built-in providers manager.
   *   Intended for use in unit tests only.
   */
  constructor(options = {}) {
    if (!options.input) {
      throw new Error("Missing options: input");
    }
    if (!options.input.window) {
      throw new Error("input is missing 'window' property.");
    }
    if (
      !options.input.window.location ||
      options.input.window.location.href != AppConstants.BROWSER_CHROME_URL
    ) {
      throw new Error("input.window should be an actual browser window.");
    }
    if (!("isPrivate" in options.input)) {
      throw new Error("input.isPrivate must be set.");
    }

    this.input = options.input;
    this.browserWindow = options.input.window;

    this.manager = options.manager || lazy.UrlbarProvidersManager;

    this._listeners = new Set();
    this._userSelectionBehavior = "none";

    this.engagementEvent = new TelemetryEvent(
      this,
      options.eventTelemetryCategory
    );

    XPCOMUtils.defineLazyGetter(this, "logger", () =>
      lazy.UrlbarUtils.getLogger({ prefix: "Controller" })
    );
  }

  get NOTIFICATIONS() {
    return NOTIFICATIONS;
  }

  /**
   * Hooks up the controller with a view.
   *
   * @param {UrlbarView} view
   *   The UrlbarView instance associated with this controller.
   */
  setView(view) {
    this.view = view;
  }

  /**
   * Takes a query context and starts the query based on the user input.
   *
   * @param {UrlbarQueryContext} queryContext The query details.
   */
  async startQuery(queryContext) {
    // Cancel any running query.
    this.cancelQuery();

    // Wrap the external queryContext, to track a unique object, in case
    // the external consumer reuses the same context multiple times.
    // This also allows to add properties without polluting the context.
    // Note this can't be null-ed or deleted once a query is done, because it's
    // used by handleDeleteEntry and handleKeyNavigation, that can run after
    // a query is cancelled or finished.
    let contextWrapper = (this._lastQueryContextWrapper = { queryContext });

    queryContext.lastResultCount = 0;
    TelemetryStopwatch.start(TELEMETRY_1ST_RESULT, queryContext);
    TelemetryStopwatch.start(TELEMETRY_6_FIRST_RESULTS, queryContext);

    // For proper functionality we must ensure this notification is fired
    // synchronously, as soon as startQuery is invoked, but after any
    // notifications related to the previous query.
    this.notify(NOTIFICATIONS.QUERY_STARTED, queryContext);
    await this.manager.startQuery(queryContext, this);
    // If the query has been cancelled, onQueryFinished was notified already.
    // Note this._lastQueryContextWrapper may have changed in the meanwhile.
    if (
      contextWrapper === this._lastQueryContextWrapper &&
      !contextWrapper.done
    ) {
      contextWrapper.done = true;
      // TODO (Bug 1549936) this is necessary to avoid leaks in PB tests.
      this.manager.cancelQuery(queryContext);
      this.notify(NOTIFICATIONS.QUERY_FINISHED, queryContext);
    }
    return queryContext;
  }

  /**
   * Cancels an in-progress query. Note, queries may continue running if they
   * can't be cancelled.
   */
  cancelQuery() {
    // We must clear the pause impression timer in any case, even if the query
    // already finished.
    this.engagementEvent.clearPauseImpressionTimer();

    // If the query finished already, don't handle cancel.
    if (!this._lastQueryContextWrapper || this._lastQueryContextWrapper.done) {
      return;
    }

    this._lastQueryContextWrapper.done = true;

    let { queryContext } = this._lastQueryContextWrapper;
    TelemetryStopwatch.cancel(TELEMETRY_1ST_RESULT, queryContext);
    TelemetryStopwatch.cancel(TELEMETRY_6_FIRST_RESULTS, queryContext);
    this.manager.cancelQuery(queryContext);
    this.notify(NOTIFICATIONS.QUERY_CANCELLED, queryContext);
    this.notify(NOTIFICATIONS.QUERY_FINISHED, queryContext);
  }

  /**
   * Receives results from a query.
   *
   * @param {UrlbarQueryContext} queryContext The query details.
   */
  receiveResults(queryContext) {
    if (queryContext.lastResultCount < 1 && queryContext.results.length >= 1) {
      TelemetryStopwatch.finish(TELEMETRY_1ST_RESULT, queryContext);
    }
    if (queryContext.lastResultCount < 6 && queryContext.results.length >= 6) {
      TelemetryStopwatch.finish(TELEMETRY_6_FIRST_RESULTS, queryContext);
    }

    this.engagementEvent.startPauseImpressionTimer(
      queryContext,
      this.input.getSearchSource()
    );

    if (queryContext.firstResultChanged) {
      // Notify the input so it can make adjustments based on the first result.
      if (this.input.onFirstResult(queryContext.results[0])) {
        // The input canceled the query and started a new one.
        return;
      }

      // The first time we receive results try to connect to the heuristic
      // result.
      this.speculativeConnect(
        queryContext.results[0],
        queryContext,
        "resultsadded"
      );
    }

    this.notify(NOTIFICATIONS.QUERY_RESULTS, queryContext);
    // Update lastResultCount after notifying, so the view can use it.
    queryContext.lastResultCount = queryContext.results.length;
  }

  /**
   * Adds a listener for query actions and results.
   *
   * @param {object} listener The listener to add.
   * @throws {TypeError} Throws if the listener is not an object.
   */
  addQueryListener(listener) {
    if (!listener || typeof listener != "object") {
      throw new TypeError("Expected listener to be an object");
    }
    this._listeners.add(listener);
  }

  /**
   * Removes a query listener.
   *
   * @param {object} listener The listener to add.
   */
  removeQueryListener(listener) {
    this._listeners.delete(listener);
  }

  /**
   * Checks whether a keyboard event that would normally open the view should
   * instead be handled natively by the input field.
   * On certain platforms, the up and down keys can be used to move the caret,
   * in which case we only want to open the view if the caret is at the
   * start or end of the input.
   *
   * @param {KeyboardEvent} event
   *   The DOM KeyboardEvent.
   * @returns {boolean}
   *   Returns true if the event should move the caret instead of opening the
   *   view.
   */
  keyEventMovesCaret(event) {
    if (this.view.isOpen) {
      return false;
    }
    if (AppConstants.platform != "macosx" && AppConstants.platform != "linux") {
      return false;
    }
    let isArrowUp = event.keyCode == KeyEvent.DOM_VK_UP;
    let isArrowDown = event.keyCode == KeyEvent.DOM_VK_DOWN;
    if (!isArrowUp && !isArrowDown) {
      return false;
    }
    let start = this.input.selectionStart;
    let end = this.input.selectionEnd;
    if (
      end != start ||
      (isArrowUp && start > 0) ||
      (isArrowDown && end < this.input.value.length)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Receives keyboard events from the input and handles those that should
   * navigate within the view or pick the currently selected item.
   *
   * @param {KeyboardEvent} event
   *   The DOM KeyboardEvent.
   * @param {boolean} executeAction
   *   Whether the event should actually execute the associated action, or just
   *   be managed (at a preventDefault() level). This is used when the event
   *   will be deferred by the event bufferer, but preventDefault() and friends
   *   should still happen synchronously.
   */
  handleKeyNavigation(event, executeAction = true) {
    const isMac = AppConstants.platform == "macosx";
    // Handle readline/emacs-style navigation bindings on Mac.
    if (
      isMac &&
      this.view.isOpen &&
      event.ctrlKey &&
      (event.key == "n" || event.key == "p")
    ) {
      if (executeAction) {
        this.view.selectBy(1, { reverse: event.key == "p" });
      }
      event.preventDefault();
      return;
    }

    if (this.view.isOpen && executeAction && this._lastQueryContextWrapper) {
      let { queryContext } = this._lastQueryContextWrapper;
      let handled = this.view.oneOffSearchButtons.handleKeyDown(
        event,
        this.view.visibleRowCount,
        this.view.allowEmptySelection,
        queryContext.searchString
      );
      if (handled) {
        return;
      }
    }

    switch (event.keyCode) {
      case KeyEvent.DOM_VK_ESCAPE:
        if (executeAction) {
          if (this.view.isOpen) {
            this.view.close();
          } else {
            this.input.handleRevert(true);
          }
        }
        event.preventDefault();
        break;
      case KeyEvent.DOM_VK_SPACE:
        if (!this.view.shouldSpaceActivateSelectedElement()) {
          break;
        }
      // Fall through, we want the SPACE key to activate this element.
      case KeyEvent.DOM_VK_RETURN:
        if (executeAction) {
          this.input.handleCommand(event);
        }
        event.preventDefault();
        break;
      case KeyEvent.DOM_VK_TAB:
        // It's always possible to tab through results when the urlbar was
        // focused with the mouse or has a search string, or when the view
        // already has a selection.
        // We allow tabbing without a search string when in search mode preview,
        // since that means the user has interacted with the Urlbar since
        // opening it.
        // When there's no search string and no view selection, we want to focus
        // the next toolbar item instead, for accessibility reasons.
        let allowTabbingThroughResults =
          this.input.focusedViaMousedown ||
          this.input.searchMode?.isPreview ||
          this.view.selectedElement ||
          (this.input.value &&
            this.input.getAttribute("pageproxystate") != "valid");
        if (
          // Even if the view is closed, we may be waiting results, and in
          // such a case we don't want to tab out of the urlbar.
          (this.view.isOpen || !executeAction) &&
          !event.ctrlKey &&
          !event.altKey &&
          allowTabbingThroughResults
        ) {
          if (executeAction) {
            this.userSelectionBehavior = "tab";
            this.view.selectBy(1, {
              reverse: event.shiftKey,
              userPressedTab: true,
            });
          }
          event.preventDefault();
        }
        break;
      case KeyEvent.DOM_VK_PAGE_DOWN:
      case KeyEvent.DOM_VK_PAGE_UP:
        if (event.ctrlKey) {
          break;
        }
      // eslint-disable-next-lined no-fallthrough
      case KeyEvent.DOM_VK_DOWN:
      case KeyEvent.DOM_VK_UP:
        if (event.altKey) {
          break;
        }
        if (this.view.isOpen) {
          if (executeAction) {
            this.userSelectionBehavior = "arrow";
            this.view.selectBy(
              event.keyCode == KeyEvent.DOM_VK_PAGE_DOWN ||
                event.keyCode == KeyEvent.DOM_VK_PAGE_UP
                ? lazy.UrlbarUtils.PAGE_UP_DOWN_DELTA
                : 1,
              {
                reverse:
                  event.keyCode == KeyEvent.DOM_VK_UP ||
                  event.keyCode == KeyEvent.DOM_VK_PAGE_UP,
              }
            );
          }
        } else {
          if (this.keyEventMovesCaret(event)) {
            break;
          }
          if (executeAction) {
            this.userSelectionBehavior = "arrow";
            this.input.startQuery({
              searchString: this.input.value,
              event,
            });
          }
        }
        event.preventDefault();
        break;
      case KeyEvent.DOM_VK_RIGHT:
      case KeyEvent.DOM_VK_END:
        this.input.maybeConfirmSearchModeFromResult({
          entry: "typed",
        });
      // Fall through.
      case KeyEvent.DOM_VK_LEFT:
      case KeyEvent.DOM_VK_HOME:
        this.view.removeAccessibleFocus();
        break;
      case KeyEvent.DOM_VK_BACK_SPACE:
        if (
          this.input.searchMode &&
          this.input.selectionStart == 0 &&
          this.input.selectionEnd == 0 &&
          !event.shiftKey
        ) {
          this.input.searchMode = null;
          this.input.view.oneOffSearchButtons.selectedButton = null;
          this.input.startQuery({
            allowAutofill: false,
            event,
          });
        }
      // Fall through.
      case KeyEvent.DOM_VK_DELETE:
        if (!this.view.isOpen) {
          break;
        }
        if (event.shiftKey) {
          if (!executeAction || this.handleDeleteEntry(event)) {
            event.preventDefault();
          }
        } else if (executeAction) {
          this.userSelectionBehavior = "none";
        }
        break;
    }
  }

  /**
   * Tries to initialize a speculative connection on a result.
   * Speculative connections are only supported for a subset of all the results.
   *
   * Speculative connect to:
   *  - Search engine heuristic results
   *  - autofill results
   *  - http/https results
   *
   * @param {UrlbarResult} result The result to speculative connect to.
   * @param {UrlbarQueryContext} context The queryContext
   * @param {string} reason Reason for the speculative connect request.
   */
  speculativeConnect(result, context, reason) {
    // Never speculative connect in private contexts.
    if (!this.input || context.isPrivate || !context.results.length) {
      return;
    }
    let { url } = lazy.UrlbarUtils.getUrlFromResult(result);
    if (!url) {
      return;
    }

    switch (reason) {
      case "resultsadded": {
        // We should connect to an heuristic result, if it exists.
        if (
          (result == context.results[0] && result.heuristic) ||
          result.autofill
        ) {
          if (result.type == lazy.UrlbarUtils.RESULT_TYPE.SEARCH) {
            // Speculative connect only if search suggestions are enabled.
            if (
              lazy.UrlbarPrefs.get("suggest.searches") &&
              lazy.UrlbarPrefs.get("browser.search.suggest.enabled")
            ) {
              let engine = Services.search.getEngineByName(
                result.payload.engine
              );
              lazy.UrlbarUtils.setupSpeculativeConnection(
                engine,
                this.browserWindow
              );
            }
          } else if (result.autofill) {
            lazy.UrlbarUtils.setupSpeculativeConnection(
              url,
              this.browserWindow
            );
          }
        }
        return;
      }
      case "mousedown": {
        // On mousedown, connect only to http/https urls.
        if (url.startsWith("http")) {
          lazy.UrlbarUtils.setupSpeculativeConnection(url, this.browserWindow);
        }
        return;
      }
      default: {
        throw new Error("Invalid speculative connection reason");
      }
    }
  }

  /**
   * Stores the selection behavior that the user has used to select a result.
   *
   * @param {"arrow"|"tab"|"none"} behavior
   *   The behavior the user used.
   */
  set userSelectionBehavior(behavior) {
    // Don't change the behavior to arrow if tab has already been recorded,
    // as we want to know that the tab was used first.
    if (behavior == "arrow" && this._userSelectionBehavior == "tab") {
      return;
    }
    this._userSelectionBehavior = behavior;
  }

  /**
   * Records details of the selected result in telemetry. We only record the
   * selection behavior, type and index.
   *
   * @param {Event} event
   *   The event which triggered the result to be selected.
   * @param {UrlbarResult} result
   *   The selected result.
   */
  recordSelectedResult(event, result) {
    let resultIndex = result ? result.rowIndex : -1;
    let selectedResult = -1;
    if (resultIndex >= 0) {
      // Except for the history popup, the urlbar always has a selection.  The
      // first result at index 0 is the "heuristic" result that indicates what
      // will happen when you press the Enter key.  Treat it as no selection.
      selectedResult = resultIndex > 0 || !result.heuristic ? resultIndex : -1;
    }
    lazy.BrowserSearchTelemetry.recordSearchSuggestionSelectionMethod(
      event,
      "urlbar",
      selectedResult,
      this._userSelectionBehavior
    );

    if (!result) {
      return;
    }

    // Do not modify existing telemetry types.  To add a new type:
    //
    // * Set telemetryType appropriately. Since telemetryType is used as the
    //   probe name, it must be alphanumeric with optional underscores.
    // * Add a new keyed scalar probe into the urlbar.picked category for the
    //   newly added telemetryType.
    // * Add a test named browser_UsageTelemetry_urlbar_newType.js to
    //   browser/modules/test/browser.
    //
    // The "topsite" type overrides the other ones, because it starts from a
    // unique user interaction, that we want to count apart. We do this here
    // rather than in telemetryTypeFromResult because other consumers, like
    // events telemetry, are reporting this information separately.
    let telemetryType =
      result.providerName == "UrlbarProviderTopSites"
        ? "topsite"
        : lazy.UrlbarUtils.telemetryTypeFromResult(result);
    Services.telemetry.keyedScalarAdd(
      `urlbar.picked.${telemetryType}`,
      resultIndex,
      1
    );
    if (this.input.searchMode && !this.input.searchMode.isPreview) {
      Services.telemetry.keyedScalarAdd(
        `urlbar.picked.searchmode.${this.input.searchMode.entry}`,
        resultIndex,
        1
      );
    }
  }

  /**
   * Handles deletion of results from the last query context and the view. There
   * are two kinds of results that can be deleted:
   *
   * - Results for which `provider.blockResult()` returns true
   * - Results whose source is `HISTORY` are handled specially by this method
   *   and can always be removed
   *
   * No other results can be deleted and this method will ignore them.
   *
   * @param {Event} event The event that triggered deletion.
   * @param {UrlbarResult} [result]
   *   The result to delete. If given, it must be present in the controller's
   *   most recent query context. If not given, the currently selected result
   *   in the view is used.
   * @returns {boolean}
   *   Returns true if the result was deleted and false if not.
   */
  handleDeleteEntry(event, result = undefined) {
    if (!this._lastQueryContextWrapper) {
      console.error("Cannot delete - the latest query is not present");
      return false;
    }
    let { queryContext } = this._lastQueryContextWrapper;

    if (!result) {
      // No result specified, so use the currently selected result.
      let { selectedElement } = this.input.view;
      if (selectedElement?.classList.contains("urlbarView-button")) {
        // For results with buttons, delete them only when the main part of the
        // row is selected, not a button.
        return false;
      }
      result = this.input.view.selectedResult;
    }

    if (result && event) {
      this.engagementEvent.record(event, {
        searchString: queryContext.searchString,
        selIndex: result.rowIndex,
        selType: "dismiss",
        provider: result.providerName,
      });
    }

    if (!result || result.heuristic) {
      return false;
    }

    // First call `provider.blockResult()`.
    let provider = lazy.UrlbarProvidersManager.getProvider(result.providerName);
    if (!provider) {
      console.error(`Provider not found: ${result.providerName}`);
    }
    let blockedByProvider = provider?.tryMethod(
      "blockResult",
      queryContext,
      result
    );

    // If the provider didn't block the result, then continue only if the result
    // is from history.
    if (
      !blockedByProvider &&
      result.source != lazy.UrlbarUtils.RESULT_SOURCE.HISTORY
    ) {
      return false;
    }

    let index = queryContext.results.indexOf(result);
    if (index < 0) {
      console.error("Failed to find the selected result in the results");
      return false;
    }

    queryContext.results.splice(index, 1);
    this.notify(NOTIFICATIONS.QUERY_RESULT_REMOVED, index);

    if (blockedByProvider) {
      return true;
    }

    // Form history or url restyled as search.
    if (result.type == lazy.UrlbarUtils.RESULT_TYPE.SEARCH) {
      if (!queryContext.formHistoryName) {
        return false;
      }
      // Generate the search url to remove it from browsing history.
      let { url } = lazy.UrlbarUtils.getUrlFromResult(result);
      lazy.PlacesUtils.history.remove(url).catch(console.error);
      // Now remove form history.
      lazy.FormHistory.update({
        op: "remove",
        fieldname: queryContext.formHistoryName,
        value: result.payload.suggestion,
      }).catch(error =>
        console.error(`Removing form history failed: ${error}`)
      );
      return true;
    }

    // Remove browsing history entries from Places.
    lazy.PlacesUtils.history.remove(result.payload.url).catch(console.error);
    return true;
  }

  /**
   * Notifies listeners of results.
   *
   * @param {string} name Name of the notification.
   * @param {object} params Parameters to pass with the notification.
   */
  notify(name, ...params) {
    for (let listener of this._listeners) {
      // Can't use "in" because some tests proxify these.
      if (typeof listener[name] != "undefined") {
        try {
          listener[name](...params);
        } catch (ex) {
          console.error(ex);
        }
      }
    }
  }
}

/**
 * Tracks and records telemetry events for the given category, if provided,
 * otherwise it's a no-op.
 * It is currently designed around the "urlbar" category, even if it can
 * potentially be extended to other categories.
 * To record an event, invoke start() with a starting event, then either
 * invoke record() with a final event, or discard() to drop the recording.
 *
 * @see Events.yaml
 */
class TelemetryEvent {
  constructor(controller, category) {
    this._controller = controller;
    this._category = category;
    this._isPrivate = controller.input.isPrivate;
  }

  /**
   * Start measuring the elapsed time from a user-generated event.
   * After this has been invoked, any subsequent calls to start() are ignored,
   * until either record() or discard() are invoked. Thus, it is safe to keep
   * invoking this on every input event as the user is typing, for example.
   *
   * @param {event} event A DOM event.
   * @param {string} [searchString] Pass a search string related to the event if
   *        you have one.  The event by itself sometimes isn't enough to
   *        determine the telemetry details we should record.
   * @throws This should never throw, or it may break the urlbar.
   * @see {@link https://firefox-source-docs.mozilla.org/browser/urlbar/telemetry.html}
   */
  start(event, searchString = null) {
    if (this._startEventInfo) {
      if (this._startEventInfo.interactionType == "topsites") {
        // If the most recent event came from opening the results pane with an
        // empty string replace the interactionType (that would be "topsites")
        // with one for the current event to better measure the user flow.
        this._startEventInfo.interactionType = this._getStartInteractionType(
          event,
          searchString
        );
        this._startEventInfo.searchString = searchString;
      } else if (
        this._startEventInfo.interactionType == "returned" &&
        (!searchString ||
          this._startEventInfo.searchString[0] != searchString[0])
      ) {
        // In case of a "returned" interaction ongoing, the user may either
        // continue the search, or restart with a new search string. In that case
        // we want to change the interaction type to "restarted".
        // Detecting all the possible ways of clearing the input would be tricky,
        // thus this makes a guess by just checking the first char matches; even if
        // the user backspaces a part of the string, we still count that as a
        // "returned" interaction.
        this._startEventInfo.interactionType = "restarted";
      }

      // start is invoked on a user-generated event, but we only count the first
      // one.  Once an engagement or abandoment happens, we clear _startEventInfo.
      return;
    }

    if (!this._category) {
      return;
    }
    if (!event) {
      console.error("Must always provide an event");
      return;
    }
    const validEvents = [
      "click",
      "command",
      "drop",
      "input",
      "keydown",
      "mousedown",
      "tabswitch",
      "focus",
    ];
    if (!validEvents.includes(event.type)) {
      console.error("Can't start recording from event type: ", event.type);
      return;
    }

    this._startEventInfo = {
      timeStamp: event.timeStamp || Cu.now(),
      interactionType: this._getStartInteractionType(event, searchString),
      searchString,
    };

    let { queryContext } = this._controller._lastQueryContextWrapper || {};

    this._controller.manager.notifyEngagementChange(
      this._isPrivate,
      "start",
      queryContext
    );
  }

  /**
   * Record an engagement telemetry event.
   * When the user picks a result from a search through the mouse or keyboard,
   * an engagement event is recorded. If instead the user abandons a search, by
   * blurring the input field, an abandonment event is recorded.
   *
   * @param {event} [event]
   *        A DOM event.
   *        Note: event can be null, that usually happens for paste&go or drop&go.
   *        If there's no _startEventInfo this is a no-op.
   * @param {object} details An object describing action details.
   * @param {string} [details.searchString] The user's search string. Note that
   *        this string is not sent with telemetry data. It is only used
   *        locally to discern other data, such as the number of characters and
   *        words in the string.
   * @param {string} [details.selIndex] Index of the selected result, undefined
   *        for "blur".
   * @param {string} [details.selType] type of the selected element, undefined
   *        for "blur". One of "unknown", "autofill", "visiturl", "bookmark",
   *        "history", "keyword", "searchengine", "searchsuggestion",
   *        "switchtab", "remotetab", "extension", "oneoff", "dismiss".
   * @param {string} [details.provider] The name of the provider for the selected
   *        result.
   * @param {DOMElement} [details.element] The picked view element.
   * @param {object} [details.startEventInfo] Additional info about the start
   *        event.
   */
  record(event, details) {
    this.clearPauseImpressionTimer();

    // This should never throw, or it may break the urlbar.
    try {
      this._internalRecord(event, details);
    } catch (ex) {
      console.error("Could not record event: ", ex);
    } finally {
      this._startEventInfo = null;
      this._discarded = false;
    }
  }

  /**
   * Clear the pause impression timer started by startPauseImpressionTimer().
   */
  clearPauseImpressionTimer() {
    lazy.clearTimeout(this._pauseImpressionTimer);
  }

  /**
   * Start a timer that records the pause impression telemetry for given context.
   * The telemetry will be recorded after
   * "browser.urlbar.searchEngagementTelemetry.pauseImpressionIntervalMs" ms.
   * If want to clear this timer, please use clearPauseImpressionTimer().
   *
   * @param {UrlbarQueryContext} queryContext
   *        The query details that will be recorded as pause impression telemetry.
   * @param {string} searchSource
   *        The seach source that will be recorded as pause impression telemetry.
   */
  startPauseImpressionTimer(queryContext, searchSource) {
    if (this._impressionStartEventInfo === this._startEventInfo) {
      // Already took an impression telemetry for this session.
      return;
    }

    this.clearPauseImpressionTimer();
    this._pauseImpressionTimer = lazy.setTimeout(() => {
      let { numChars, numWords, searchWords } = this._parseSearchString(
        queryContext.searchString
      );
      this._recordSearchEngagementTelemetry(
        queryContext,
        "impression",
        this._startEventInfo,
        {
          reason: "pause",
          numChars,
          numWords,
          searchWords,
          searchSource,
        }
      );

      this._impressionStartEventInfo = this._startEventInfo;
    }, lazy.UrlbarPrefs.get("searchEngagementTelemetry.pauseImpressionIntervalMs"));
  }

  _internalRecord(event, details) {
    const startEventInfo = details.startEventInfo ?? this._startEventInfo;

    if (!this._category || !startEventInfo) {
      if (this._discarded && this._category && details?.selType !== "dismiss") {
        let { queryContext } = this._controller._lastQueryContextWrapper || {};
        this._controller.manager.notifyEngagementChange(
          this._isPrivate,
          "discard",
          queryContext
        );
      }
      return;
    }
    if (
      !event &&
      startEventInfo.interactionType != "pasted" &&
      startEventInfo.interactionType != "dropped"
    ) {
      // If no event is passed, we must be executing either paste&go or drop&go.
      throw new Error("Event must be defined, unless input was pasted/dropped");
    }
    if (!details) {
      throw new Error("Invalid event details: " + details);
    }

    let action;
    if (!event) {
      action =
        startEventInfo.interactionType == "dropped" ? "drop_go" : "paste_go";
    } else if (event.type == "blur") {
      action = "blur";
    } else {
      action = MouseEvent.isInstance(event) ? "click" : "enter";
    }

    let method = action == "blur" ? "abandonment" : "engagement";

    // numWords is not a perfect measurement, since it will return an incorrect
    // value for languages that do not use spaces or URLs containing spaces in
    // its query parameters, for example.
    let { numChars, numWords, searchWords } = this._parseSearchString(
      details.searchString
    );

    let { queryContext } = this._controller._lastQueryContextWrapper || {};

    this._recordSearchEngagementTelemetry(
      queryContext,
      method,
      startEventInfo,
      {
        action,
        numChars,
        numWords,
        searchWords,
        provider: details.provider,
        searchSource: details.searchSource,
        searchMode: details.searchMode,
        selectedElement: details.element,
        selIndex: details.selIndex,
        selType: details.selType,
      }
    );

    if (details.selType === "dismiss") {
      // The conventional telemetry dones't support "dismiss" event.
      return;
    }

    let endTime = (event && event.timeStamp) || Cu.now();
    let startTime = startEventInfo.timeStamp || endTime;
    // Synthesized events in tests may have a bogus timeStamp, causing a
    // subtraction between monotonic and non-monotonic timestamps; that's why
    // abs is necessary here. It should only happen in tests, anyway.
    let elapsed = Math.abs(Math.round(endTime - startTime));

    // Rather than listening to the pref, just update status when we record an
    // event, if the pref changed from the last time.
    let recordingEnabled = lazy.UrlbarPrefs.get("eventTelemetry.enabled");
    if (this._eventRecordingEnabled != recordingEnabled) {
      this._eventRecordingEnabled = recordingEnabled;
      Services.telemetry.setEventRecordingEnabled("urlbar", recordingEnabled);
    }

    let extra = {
      elapsed: elapsed.toString(),
      numChars,
      numWords,
    };

    if (method == "engagement") {
      extra.selIndex = details.selIndex.toString();
      extra.selType = details.selType;
      extra.provider = details.provider || "";
    }

    // We invoke recordEvent regardless, if recording is disabled this won't
    // report the events remotely, but will count it in the event_counts scalar.
    Services.telemetry.recordEvent(
      this._category,
      method,
      action,
      startEventInfo.interactionType,
      extra
    );

    Services.telemetry.scalarAdd(
      method == "engagement"
        ? TELEMETRY_SCALAR_ENGAGEMENT
        : TELEMETRY_SCALAR_ABANDONMENT,
      1
    );

    if (method === "engagement" && queryContext.results?.[0].autofill) {
      // Record autofill impressions upon engagement.
      const type = lazy.UrlbarUtils.telemetryTypeFromResult(
        queryContext.results[0]
      );
      Services.telemetry.scalarAdd(`urlbar.impression.${type}`, 1);
    }

    this._controller.manager.notifyEngagementChange(
      this._isPrivate,
      method,
      queryContext,
      details
    );
  }

  _recordSearchEngagementTelemetry(
    queryContext,
    method,
    startEventInfo,
    {
      action,
      numWords,
      numChars,
      provider,
      reason,
      searchWords,
      searchSource,
      searchMode,
      selectedElement,
      selIndex,
      selType,
    }
  ) {
    const browserWindow = this._controller.browserWindow;
    let sap = "urlbar";
    if (searchSource === "urlbar-handoff") {
      sap = "handoff";
    } else if (
      browserWindow.isBlankPageURL(browserWindow.gBrowser.currentURI.spec)
    ) {
      sap = "urlbar_newtab";
    } else if (browserWindow.gBrowser.currentURI.schemeIs("moz-extension")) {
      sap = "urlbar_addonpage";
    }

    searchMode = searchMode ?? this._controller.input.searchMode;

    // Distinguish user typed search strings from persisted search terms.
    const interaction = this.#getInteractionType(
      method,
      startEventInfo,
      searchSource,
      searchWords,
      searchMode
    );
    const search_mode = this.#getSearchMode(searchMode);
    const currentResults = queryContext?.results ?? [];
    const numResults = currentResults.length;
    const groups = currentResults
      .map(r => lazy.UrlbarUtils.searchEngagementTelemetryGroup(r))
      .join(",");
    const results = currentResults
      .map(r => lazy.UrlbarUtils.searchEngagementTelemetryType(r))
      .join(",");

    let eventInfo;
    if (method === "engagement") {
      const selectedResult = currentResults[selIndex];
      eventInfo = {
        sap,
        interaction,
        search_mode,
        n_chars: numChars,
        n_words: numWords,
        n_results: numResults,
        selected_result: lazy.UrlbarUtils.searchEngagementTelemetryType(
          selectedResult
        ),
        selected_result_subtype: lazy.UrlbarUtils.searchEngagementTelemetrySubtype(
          selectedResult,
          selectedElement
        ),
        provider,
        engagement_type:
          selType === "help" || selType === "dismiss" ? selType : action,
        groups,
        results,
      };
    } else if (method === "abandonment") {
      eventInfo = {
        sap,
        interaction,
        search_mode,
        n_chars: numChars,
        n_words: numWords,
        n_results: numResults,
        groups,
        results,
      };
    } else if (method === "impression") {
      eventInfo = {
        reason,
        sap,
        interaction,
        search_mode,
        n_chars: numChars,
        n_words: numWords,
        n_results: numResults,
        groups,
        results,
      };
    } else {
      console.error(`Unknown telemetry event method: ${method}`);
      return;
    }

    this._controller.logger.info(
      `${method} event: ${JSON.stringify(eventInfo)}`
    );

    if (lazy.UrlbarPrefs.get("searchEngagementTelemetryEnabled")) {
      Glean.urlbar[method].record(eventInfo);
    }
  }

  #getInteractionType(
    method,
    startEventInfo,
    searchSource,
    searchWords,
    searchMode
  ) {
    if (searchMode?.entry === "topsites_newtab") {
      return "topsite_search";
    }

    let interaction = startEventInfo.interactionType;
    if (
      (interaction === "returned" || interaction === "restarted") &&
      this._isRefined(new Set(searchWords), this.#previousSearchWordsSet)
    ) {
      interaction = "refined";
    }

    if (searchSource === "urlbar-persisted") {
      switch (interaction) {
        case "returned": {
          interaction = "persisted_search_terms";
          break;
        }
        case "restarted":
        case "refined": {
          interaction = `persisted_search_terms_${interaction}`;
          break;
        }
      }
    }

    if (
      (method === "engagement" &&
        lazy.UrlbarPrefs.isPersistedSearchTermsEnabled()) ||
      method === "abandonment"
    ) {
      this.#previousSearchWordsSet = new Set(searchWords);
    } else if (method === "engagement") {
      this.#previousSearchWordsSet = null;
    }

    return interaction;
  }

  #getSearchMode(searchMode) {
    if (!searchMode) {
      return "";
    }

    if (searchMode.engineName) {
      return "search_engine";
    }

    const source = lazy.UrlbarUtils.LOCAL_SEARCH_MODES.find(
      m => m.source == searchMode.source
    )?.telemetryLabel;
    return source ?? "unknown";
  }

  _parseSearchString(searchString) {
    let numChars = searchString.length.toString();
    let searchWords = searchString
      .substring(0, lazy.UrlbarUtils.MAX_TEXT_LENGTH)
      .trim()
      .split(lazy.UrlbarTokenizer.REGEXP_SPACES)
      .filter(t => t);
    let numWords = searchWords.length.toString();

    return {
      numChars,
      numWords,
      searchWords,
    };
  }

  /**
   * Checks whether re-searched by modifying some of the keywords from the
   * previous search. Concretely, returns true if there is intersects between
   * both keywords, otherwise returns false. Also, returns false even if both
   * are the same.
   *
   * @param {Set} currentSet The current keywords.
   * @param {Set} [previousSet] The previous keywords.
   * @returns {boolean} true if current searching are refined.
   */
  _isRefined(currentSet, previousSet = null) {
    if (!previousSet) {
      return false;
    }

    const intersect = (setA, setB) => {
      let count = 0;
      for (const word of setA.values()) {
        if (setB.has(word)) {
          count += 1;
        }
      }
      return count > 0 && count != setA.size;
    };

    return (
      intersect(currentSet, previousSet) || intersect(previousSet, currentSet)
    );
  }

  _getStartInteractionType(event, searchString) {
    if (event.interactionType) {
      return event.interactionType;
    } else if (event.type == "input") {
      return lazy.UrlbarUtils.isPasteEvent(event) ? "pasted" : "typed";
    } else if (event.type == "drop") {
      return "dropped";
    } else if (searchString) {
      return "typed";
    }
    return "topsites";
  }

  /**
   * Resets the currently tracked user-generated event that was registered via
   * start(), so it won't be recorded.  If there's no tracked event, this is a
   * no-op.
   */
  discard() {
    this.clearPauseImpressionTimer();
    if (this._startEventInfo) {
      this._startEventInfo = null;
      this._discarded = true;
    }
  }

  /**
   * Extracts a telemetry type from an element for event telemetry.
   *
   * @param {Element} element The element to analyze.
   * @returns {string} a string type for the telemetry event.
   */
  typeFromElement(element) {
    if (!element) {
      return "none";
    }
    let row = element.closest(".urlbarView-row");
    if (row.result && row.result.providerName != "UrlbarProviderTopSites") {
      // Element handlers go here.
      if (element.classList.contains("urlbarView-button-help")) {
        return row.result.type == lazy.UrlbarUtils.RESULT_TYPE.TIP
          ? "tiphelp"
          : "help";
      }
      if (element.classList.contains("urlbarView-button-block")) {
        return "block";
      }
    }
    // Now handle the result.
    return lazy.UrlbarUtils.telemetryTypeFromResult(row.result);
  }

  /**
   * Reset the internal state. This function is used for only when testing.
   */
  reset() {
    this.#previousSearchWordsSet = null;
  }

  #previousSearchWordsSet = null;
}
