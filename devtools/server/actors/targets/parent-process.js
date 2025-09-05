/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/*
 * Target actor for the entire parent process.
 *
 * This actor extends WindowGlobalTargetActor.
 *
 * See devtools/docs/contributor/backend/actor-hierarchy.md for more details about all the targets.
 */

const {
  DevToolsServer,
} = require("resource://devtools/server/devtools-server.js");
const {
  getChildDocShells,
  WindowGlobalTargetActor,
} = require("resource://devtools/server/actors/targets/window-global.js");
const makeDebugger = require("resource://devtools/server/actors/utils/make-debugger.js");

const {
  parentProcessTargetSpec,
} = require("resource://devtools/shared/specs/targets/parent-process.js");

class ParentProcessTargetActor extends WindowGlobalTargetActor {
  /**
   * Creates a target actor for debugging all the chrome content in the parent process.
   * Most of the implementation is inherited from WindowGlobalTargetActor.
   * ParentProcessTargetActor is a child of RootActor, it can be instantiated via
   * RootActor.getProcess request. ParentProcessTargetActor exposes all target-scoped actors
   * via its form() request, like WindowGlobalTargetActor.
   *
   * @param {DevToolsServerConnection} conn
   *        The connection to the client.
   * @param {Boolean} options.isTopLevelTarget
   *        flag to indicate if this is the top
   *        level target of the DevTools session
   * @param {Object} options.sessionContext
   *        The Session Context to help know what is debugged.
   *        See devtools/server/actors/watcher/session-context.js
   */
  constructor(conn, { isTopLevelTarget, sessionContext }) {
    super(conn, {
      isTopLevelTarget,
      sessionContext,
      customSpec: parentProcessTargetSpec,
    });

    // This creates a Debugger instance for chrome debugging all globals.
    this.makeDebugger = makeDebugger.bind(null, {
      findDebuggees: dbg =>
        dbg.findAllGlobals().map(g => g.unsafeDereference()),
      shouldAddNewGlobalAsDebuggee: () => true,
    });

    // Ensure catching the creation of any new content docshell
    this.watchNewDocShells = true;

    this.isRootActor = true;

    // Listen for any new/destroyed chrome docshell
    Services.obs.addObserver(this, "chrome-webnavigation-create");
    Services.obs.addObserver(this, "chrome-webnavigation-destroy");

    this.setDocShell(this._getInitialDocShell());
  }

  // Overload setDocShell in order to observe all the docshells.
  // WindowGlobalTargetActor only observes the top level one.
  setDocShell(initialDocShell) {
    super.setDocShell(initialDocShell);

    // Iterate over all top-level windows.
    for (const { docShell } of Services.ww.getWindowEnumerator()) {
      if (docShell == this.docShell) {
        continue;
      }
      this._progressListener.watch(docShell);
    }
  }

  _getInitialDocShell() {
    // Defines the default docshell selected for the target actor
    let window = Services.wm.getMostRecentWindow(
      DevToolsServer.chromeWindowType
    );

    // Default to any available top level window if there is no expected window
    // eg when running ./mach run --chrome chrome://browser/content/aboutTabCrashed.xhtml --jsdebugger
    if (!window) {
      // If DevTools is started early enough, this window will be the
      // early navigator:blank window created in BrowserGlue.sys.mjs
      window = Services.wm.getMostRecentWindow(null);
    }

    // On Fenix, we may not have any document to inspect when there is no tab
    // opened, so return a fake document, just to ensure the ParentProcessWindowGlobalTarget
    // actor has a functional document to operate with.
    if (!window) {
      const browser = Services.appShell.createWindowlessBrowser(false);

      // Keep a strong reference to the document to keep it alive
      this.headlessBrowser = browser;

      // Create a document in order to avoid being on the initial about:blank document
      // and have the document be ignored because its `isInitialDocument` attribute being true
      const systemPrincipal =
        Services.scriptSecurityManager.getSystemPrincipal();
      browser.docShell.createAboutBlankDocumentViewer(
        systemPrincipal,
        systemPrincipal
      );

      window = browser.docShell.domWindow;

      // Set some content to be shown in the inspector
      window.document.body.textContent =
        "Fake DevTools document, as there is no tab opened yet";
    }

    return window.docShell;
  }

  /**
   * Getter for the list of all docshells in this targetActor
   * @return {Array}
   */
  get docShells() {
    // Iterate over all top-level windows and all their docshells.
    let docShells = [];
    for (const { docShell } of Services.ww.getWindowEnumerator()) {
      docShells = docShells.concat(getChildDocShells(docShell));
    }

    return docShells;
  }

  observe(subject, topic, data) {
    super.observe(subject, topic, data);
    if (this.isDestroyed()) {
      return;
    }

    subject.QueryInterface(Ci.nsIDocShell);

    if (topic == "chrome-webnavigation-create") {
      this._onDocShellCreated(subject);
    } else if (topic == "chrome-webnavigation-destroy") {
      this._onDocShellDestroy(subject);
    }
  }

  _detach() {
    if (this.isDestroyed()) {
      return false;
    }

    Services.obs.removeObserver(this, "chrome-webnavigation-create");
    Services.obs.removeObserver(this, "chrome-webnavigation-destroy");

    // Iterate over all top-level windows.
    for (const { docShell } of Services.ww.getWindowEnumerator()) {
      if (docShell == this.docShell) {
        continue;
      }
      this._progressListener.unwatch(docShell);
    }

    this.headlessBrowser = null;

    return super._detach();
  }
}

exports.ParentProcessTargetActor = ParentProcessTargetActor;
