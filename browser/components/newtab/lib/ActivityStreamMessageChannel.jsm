/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AboutHomeStartupCache: "resource:///modules/BrowserGlue.sys.mjs",
  AboutNewTabParent: "resource:///actors/AboutNewTabParent.sys.mjs",
});

const {
  actionCreators: ac,
  actionTypes: at,
  actionUtils: au,
} = ChromeUtils.importESModule(
  "resource://activity-stream/common/Actions.sys.mjs"
);

const ABOUT_NEW_TAB_URL = "about:newtab";

const DEFAULT_OPTIONS = {
  dispatch(action) {
    throw new Error(
      `\nMessageChannel: Received action ${action.type}, but no dispatcher was defined.\n`
    );
  },
  pageURL: ABOUT_NEW_TAB_URL,
  outgoingMessageName: "ActivityStream:MainToContent",
  incomingMessageName: "ActivityStream:ContentToMain",
};

class ActivityStreamMessageChannel {
  /**
   * ActivityStreamMessageChannel - This module connects a Redux store to the new tab page actor.
   *                  You should use the BroadcastToContent, AlsoToOneContent, and AlsoToMain action creators
   *                  in common/Actions.sys.mjs to help you create actions that will be automatically routed
   *                  to the correct location.
   *
   * @param  {object} options
   * @param  {function} options.dispatch The dispatch method from a Redux store
   * @param  {string} options.pageURL The URL to which the channel is attached, such as about:newtab.
   * @param  {string} options.outgoingMessageName The name of the message sent to child processes
   * @param  {string} options.incomingMessageName The name of the message received from child processes
   * @return {ActivityStreamMessageChannel}
   */
  constructor(options = {}) {
    Object.assign(this, DEFAULT_OPTIONS, options);

    this.middleware = this.middleware.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onNewTabLoad = this.onNewTabLoad.bind(this);
    this.onNewTabUnload = this.onNewTabUnload.bind(this);
    this.onNewTabInit = this.onNewTabInit.bind(this);
  }

  /**
   * Get an iterator over the loaded tab objects.
   */
  get loadedTabs() {
    // In the test, AboutNewTabParent is not defined.
    return lazy.AboutNewTabParent?.loadedTabs || new Map();
  }

  /**
   * middleware - Redux middleware that looks for AlsoToOneContent and BroadcastToContent type
   *              actions, and sends them out.
   *
   * @param  {object} store A redux store
   * @return {function} Redux middleware
   */
  middleware(store) {
    return next => action => {
      const skipMain = action.meta && action.meta.skipMain;
      if (au.isSendToOneContent(action)) {
        this.send(action);
      } else if (au.isBroadcastToContent(action)) {
        this.broadcast(action);
      } else if (au.isSendToPreloaded(action)) {
        this.sendToPreloaded(action);
      }

      if (!skipMain) {
        next(action);
      }
    };
  }

  /**
   * onActionFromContent - Handler for actions from a content processes
   *
   * @param  {object} action  A Redux action
   * @param  {string} targetId The portID of the port that sent the message
   */
  onActionFromContent(action, targetId) {
    this.dispatch(ac.AlsoToMain(action, this.validatePortID(targetId)));
  }

  /**
   * broadcast - Sends an action to all ports
   *
   * @param  {object} action A Redux action
   */
  broadcast(action) {
    // We're trying to update all tabs, so signal the AboutHomeStartupCache
    // that its likely time to refresh the cache.
    lazy.AboutHomeStartupCache.onPreloadedNewTabMessage();

    for (let { actor } of this.loadedTabs.values()) {
      try {
        actor.sendAsyncMessage(this.outgoingMessageName, action);
      } catch (e) {
        // The target page is closed/closing by the user or test, so just ignore.
      }
    }
  }

  /**
   * send - Sends an action to a specific port
   *
   * @param  {obj} action A redux action; it should contain a portID in the meta.toTarget property
   */
  send(action) {
    const targetId = action.meta && action.meta.toTarget;
    const target = this.getTargetById(targetId);
    try {
      target.sendAsyncMessage(this.outgoingMessageName, action);
    } catch (e) {
      // The target page is closed/closing by the user or test, so just ignore.
    }
  }

  /**
   * A valid portID is a combination of process id and a port number.
   * It is generated in AboutNewTabChild.sys.mjs.
   */
  validatePortID(id) {
    if (typeof id !== "string" || !id.includes(":")) {
      console.error("Invalid portID");
    }

    return id;
  }

  /**
   * getTargetById - Retrieve the message target by portID, if it exists
   *
   * @param  {string} id A portID
   * @return {obj|null} The message target, if it exists.
   */
  getTargetById(id) {
    this.validatePortID(id);

    for (let { portID, actor } of this.loadedTabs.values()) {
      if (portID === id) {
        return actor;
      }
    }
    return null;
  }

  /**
   * sendToPreloaded - Sends an action to each preloaded browser, if any
   *
   * @param  {obj} action A redux action
   */
  sendToPreloaded(action) {
    // We're trying to update the preloaded about:newtab, so signal
    // the AboutHomeStartupCache that its likely time to refresh
    // the cache.
    lazy.AboutHomeStartupCache.onPreloadedNewTabMessage();

    const preloadedActors = this.getPreloadedActors();
    if (preloadedActors && action.data) {
      for (let preloadedActor of preloadedActors) {
        try {
          preloadedActor.sendAsyncMessage(this.outgoingMessageName, action);
        } catch (e) {
          // The preloaded page is no longer available, so just ignore.
        }
      }
    }
  }

  /**
   * getPreloadedActors - Retrieve the preloaded actors
   *
   * @return {Array|null} An array of actors belonging to the preloaded browsers, or null
   *                      if there aren't any preloaded browsers
   */
  getPreloadedActors() {
    let preloadedActors = [];
    for (let { actor, browser } of this.loadedTabs.values()) {
      if (this.isPreloadedBrowser(browser)) {
        preloadedActors.push(actor);
      }
    }
    return preloadedActors.length ? preloadedActors : null;
  }

  /**
   * isPreloadedBrowser - Returns true if the passed browser has been preloaded
   *                      for faster rendering of new tabs.
   *
   * @param {<browser>} A <browser> to check.
   * @return {bool} True if the browser is preloaded.
   *                      if there aren't any preloaded browsers
   */
  isPreloadedBrowser(browser) {
    return browser.getAttribute("preloadedState") === "preloaded";
  }

  simulateMessagesForExistingTabs() {
    // Some pages might have already loaded, so we won't get the usual message
    for (const loadedTab of this.loadedTabs.values()) {
      let simulatedDetails = {
        actor: loadedTab.actor,
        browser: loadedTab.browser,
        browsingContext: loadedTab.browsingContext,
        portID: loadedTab.portID,
        url: loadedTab.url,
        simulated: true,
      };

      this.onActionFromContent(
        {
          type: at.NEW_TAB_INIT,
          data: simulatedDetails,
        },
        loadedTab.portID
      );

      if (loadedTab.loaded) {
        this.tabLoaded(simulatedDetails);
      }
    }

    // It's possible that those existing tabs had sent some messages up
    // to us before the feeds / ActivityStreamMessageChannel was ready.
    //
    // AboutNewTabParent takes care of queueing those for us, so
    // now that we're ready, we can flush these queued messages.
    lazy.AboutNewTabParent.flushQueuedMessagesFromContent();
  }

  /**
   * onNewTabInit - Handler for special RemotePage:Init message fired
   * on initialization.
   *
   * @param  {obj} msg The messsage from a page that was just initialized
   * @param  {obj} tabDetails details about a loaded tab
   *
   * tabDetails contains:
   *   actor, browser, browsingContext, portID, url
   */
  onNewTabInit(msg, tabDetails) {
    this.onActionFromContent(
      {
        type: at.NEW_TAB_INIT,
        data: tabDetails,
      },
      msg.data.portID
    );
  }

  /**
   * onNewTabLoad - Handler for special RemotePage:Load message fired on page load.
   *
   * @param  {obj} msg The messsage from a page that was just loaded
   * @param  {obj} tabDetails details about a loaded tab, similar to onNewTabInit
   */
  onNewTabLoad(msg, tabDetails) {
    this.tabLoaded(tabDetails);
  }

  tabLoaded(tabDetails) {
    tabDetails.loaded = true;

    let { browser } = tabDetails;
    if (
      this.isPreloadedBrowser(browser) &&
      browser.ownerGlobal.windowState !== browser.ownerGlobal.STATE_MINIMIZED &&
      !browser.ownerGlobal.isFullyOccluded
    ) {
      // As a perceived performance optimization, if this loaded Activity Stream
      // happens to be a preloaded browser in a window that is not minimized or
      // occluded, have it render its layers to the compositor now to increase
      // the odds that by the time we switch to the tab, the layers are already
      // ready to present to the user.
      browser.renderLayers = true;
    }

    this.onActionFromContent({ type: at.NEW_TAB_LOAD }, tabDetails.portID);
  }

  /**
   * onNewTabUnloadLoad - Handler for special RemotePage:Unload message fired
   * on page unload.
   *
   * @param  {obj} msg The messsage from a page that was just unloaded
   * @param  {obj} tabDetails details about a loaded tab, similar to onNewTabInit
   */
  onNewTabUnload(msg, tabDetails) {
    this.onActionFromContent({ type: at.NEW_TAB_UNLOAD }, tabDetails.portID);
  }

  /**
   * onMessage - Handles custom messages from content. It expects all messages to
   *             be formatted as Redux actions, and dispatches them to this.store
   *
   * @param  {obj} msg A custom message from content
   * @param  {obj} msg.action A Redux action (e.g. {type: "HELLO_WORLD"})
   * @param  {obj} msg.target A message target
   * @param  {obj} tabDetails details about a loaded tab, similar to onNewTabInit
   */
  onMessage(msg, tabDetails) {
    if (!msg.data || !msg.data.type) {
      console.error(
        new Error(
          `Received an improperly formatted message from ${tabDetails.portID}`
        )
      );
      return;
    }
    let action = {};
    Object.assign(action, msg.data);
    // target is used to access a browser reference that came from the content
    // and should only be used in feeds (not reducers)
    action._target = {
      browser: tabDetails.browser,
    };

    this.onActionFromContent(action, tabDetails.portID);
  }
}

const EXPORTED_SYMBOLS = ["ActivityStreamMessageChannel", "DEFAULT_OPTIONS"];
