/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {
  processDescriptorSpec,
} = require("resource://devtools/shared/specs/descriptors/process.js");
const {
  WindowGlobalTargetFront,
} = require("resource://devtools/client/fronts/targets/window-global.js");
const {
  ContentProcessTargetFront,
} = require("resource://devtools/client/fronts/targets/content-process.js");
const {
  FrontClassWithSpec,
  registerFront,
} = require("resource://devtools/shared/protocol.js");
const {
  DescriptorMixin,
} = require("resource://devtools/client/fronts/descriptors/descriptor-mixin.js");
const DESCRIPTOR_TYPES = require("resource://devtools/client/fronts/descriptors/descriptor-types.js");

class ProcessDescriptorFront extends DescriptorMixin(
  FrontClassWithSpec(processDescriptorSpec)
) {
  constructor(client, targetFront, parentFront) {
    super(client, targetFront, parentFront);
    this._isParent = false;
    this._processTargetFront = null;
    this._targetFrontPromise = null;
  }

  descriptorType = DESCRIPTOR_TYPES.PROCESS;

  form(json) {
    this.id = json.id;
    this._isParent = json.isParent;
    this._isWindowlessParent = json.isWindowlessParent;
    this.traits = json.traits || {};
  }

  async _createProcessTargetFront(form) {
    let front = null;
    // the request to getTarget may return a ContentProcessTargetActor or a
    // ParentProcessTargetActor. In most cases getProcess(0) will return the
    // main process target actor, which is a ParentProcessTargetActor, but
    // not in xpcshell, which uses a ContentProcessTargetActor. So select
    // the right front based on the actor ID.
    if (form.actor.includes("parentProcessTarget")) {
      // ParentProcessTargetActor doesn't have a specific front, instead it uses
      // WindowGlobalTargetFront on the client side.
      front = new WindowGlobalTargetFront(this._client, null, this);
    } else {
      front = new ContentProcessTargetFront(this._client, null, this);
    }
    // As these fronts aren't instantiated by protocol.js, we have to set their actor ID
    // manually like that:
    front.actorID = form.actor;
    front.form(form);

    // @backward-compat { version 84 } Older server don't send the processID in the form
    if (!front.processID) {
      front.processID = this.id;
    }

    this.manage(front);
    return front;
  }

  /**
   * This flag should be true for parent process descriptors of a regular
   * browser instance, where you can expect the target to be associated with a
   * window global.
   *
   * This will typically be true for the descriptor used by the Browser Toolbox
   * or the Browser Console opened against a regular Firefox instance.
   *
   * On the contrary this will be false for parent process descriptors created
   * for xpcshell debugging or for background task debugging.
   */
  get isBrowserProcessDescriptor() {
    return this._isParent && !this._isWindowlessParent;
  }

  get isParentProcessDescriptor() {
    return this._isParent;
  }

  get isProcessDescriptor() {
    return true;
  }

  getCachedTarget() {
    return this._processTargetFront;
  }

  async getTarget() {
    // Only return the cached Target if it is still alive.
    if (this._processTargetFront && !this._processTargetFront.isDestroyed()) {
      return this._processTargetFront;
    }
    // Otherwise, ensure that we don't try to spawn more than one Target by
    // returning the pending promise
    if (this._targetFrontPromise) {
      return this._targetFrontPromise;
    }
    this._targetFrontPromise = (async () => {
      let targetFront = null;
      try {
        // @backward-compat { version 110 } isBrowserToolboxFission is no longer
        // necessary for servers with version 110 or newer. This can be replaced
        // with `const targetForm = await super.getTarget();` when 110 reaches
        // the release channel.
        const targetForm = await super.getTarget({
          isBrowserToolboxFission: true,
        });
        targetFront = await this._createProcessTargetFront(targetForm);
      } catch (e) {
        // This is likely to happen if we get a lot of events which drop previous
        // processes.
        console.log(
          `Request to connect to ProcessDescriptor "${this.id}" failed: ${e}`
        );
      }
      // Save the reference to the target only after the call to attach
      // so that getTarget always returns the attached target in case of concurrent calls
      this._processTargetFront = targetFront;
      // clear the promise if we are finished so that we can re-connect if
      // necessary
      this._targetFrontPromise = null;
      return targetFront;
    })();
    return this._targetFrontPromise;
  }

  // @backward-compat { version 110 } isBrowserToolboxFission is no longer
  // necessary for servers with version 110 or newer. This method can be
  // completely removed from the front when 110 reaches the release channel.
  getWatcher() {
    return super.getWatcher({
      isBrowserToolboxFission: true,
    });
  }

  destroy() {
    if (this._processTargetFront) {
      this._processTargetFront.destroy();
      this._processTargetFront = null;
    }
    this._targetFrontPromise = null;
    super.destroy();
  }
}

exports.ProcessDescriptorFront = ProcessDescriptorFront;
registerFront(ProcessDescriptorFront);
