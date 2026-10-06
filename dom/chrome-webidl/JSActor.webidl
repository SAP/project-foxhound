/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


interface mixin JSActor {
    [Throws]
    undefined sendAsyncMessage(DOMString messageName,
                               optional any obj,
                               optional any transferables);

    /**
     * Note that transfers are currently not supported by sendQuery. See Bug 1579536.
     */
    [NewObject]
    Promise<any> sendQuery(DOMString messageName,
                           optional any obj);

    readonly attribute UTF8String name;
};

/**
 * WebIDL callback interface version of the nsIObserver interface for use when
 * calling the observe method on JSActors.
 *
 * NOTE: This isn't marked as ChromeOnly, as it has no interface object, and
 * thus cannot be conditionally exposed.
 */
[Exposed=Window]
callback interface MozObserverCallback {
  undefined observe(nsISupports subject, ByteString topic, DOMString? data);
};

/**
 * WebIDL callback interface calling the `didDestroy`, and
 * `actorCreated` methods on JSActors.
 */
[MOZ_CAN_RUN_SCRIPT_BOUNDARY]
callback MozJSActorCallback = undefined();

/**
 * The didDestroy method, if present, will be called after the actor is no
 * longer able to receive any more messages.
 * The actorCreated method, if present, will be called immediately after the
 * actor has been created and initialized.
 */
[GenerateInit]
dictionary MozJSActorCallbacks {
  [ChromeOnly] MozJSActorCallback didDestroy;
  [ChromeOnly] MozJSActorCallback actorCreated;
};

/**
 * Base class for the data structures used to register JS actors.
 */
dictionary JSActorOptions {
  /**
   * An array of remote types which restricts where the child side of the actor
   * can be instantiated. If this is defined, then the remote type prefix of
   * the process where the child side of the actor is being instantiated must
   * begin with one of the strings in the array. For example, if Fission is
   * enabled, the prefix of a child process's remote type will be `webIsolated`.
   * This would be matched by both `"web"` and `"webIsolated"`.
   *
   * The special string `"parent"` is used to match the parent process, as its
   * actual remote type cannot be cleanly included in the list. (As of May 2026
   * `NOT_REMOTE_TYPE` is `null` in JS, and `VoidCString()` in C++.)
   *
   * If not passed, all processes are allowed to instantiate the actor.
   */
  sequence<UTF8String> remoteTypes;
};

dictionary JSActorSidedOptions {
  /**
   * The ESM path which should be loaded for the actor on this side.
   *
   * If this is not passed, the specified side cannot receive messages, but may
   * send them using `sendAsyncMessage` or `sendQuery`.
   */
  ByteString esModuleURI;
};
