/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * An actor architecture designed to allow compositional parent/content
 * communications. The lifetime of a JSWindowActor{Child, Parent} is the `WindowGlobalParent`
 * (for the parent-side) / `WindowGlobalChild` (for the child-side).
 *
 * See https://firefox-source-docs.mozilla.org/dom/ipc/jsactors.html for
 * more details on how to use this architecture.
 */

interface nsISupports;

[ChromeOnly, Exposed=Window]
interface JSWindowActorParent {
  [ChromeOnly]
  constructor();

  /**
   * Actor initialization occurs after the constructor is called but before the
   * first message is delivered. Until the actor is initialized, accesses to
   * manager will fail.
   */
  readonly attribute WindowGlobalParent? manager;

  /**
   * The WindowContext associated with this JSWindowActorParent. For
   * JSWindowActorParent this is identical to `manager`, but is also exposed as
   * `windowContext` for consistency with `JSWindowActorChild`. Until the actor
   * is initialized, accesses to windowContext will fail.
   */
  readonly attribute WindowContext? windowContext;

  [Throws]
  readonly attribute CanonicalBrowsingContext? browsingContext;
};
JSWindowActorParent includes JSActor;

[ChromeOnly, Exposed=Window]
interface JSWindowActorChild {
  [ChromeOnly]
  constructor();

  /**
   * Actor initialization occurs after the constructor is called but before the
   * first message is delivered. Until the actor is initialized, accesses to
   * manager will fail.
   */
  readonly attribute WindowGlobalChild? manager;

  /**
   * The WindowContext associated with this JSWindowActorChild. Until the actor
   * is initialized, accesses to windowContext will fail.
   */
  readonly attribute WindowContext? windowContext;

  [Throws]
  readonly attribute Document? document;

  [Throws]
  readonly attribute BrowsingContext? browsingContext;

  [Throws]
  readonly attribute nsIDocShell? docShell;

  /**
   * NOTE: As this returns a window proxy, it may not be currently referencing
   * the document associated with this JSWindowActor. Generally prefer using
   * `document`.
   */
  [Throws]
  readonly attribute WindowProxy? contentWindow;
};
JSWindowActorChild includes JSActor;

/**
 * Used by `ChromeUtils.registerWindowActor()` to register actors.
 */
dictionary WindowActorOptions : JSActorOptions {
  /**
   * If this is set to `true`, allow this actor to be created for subframes,
   * and not just toplevel window globals.
   */
  boolean allFrames = false;

  /**
   * If this is set to `true`, allow this actor to be created for window
   * globals loaded in chrome browsing contexts, such as those used to load the
   * tabbrowser.
   */
  boolean includeChrome = false;

  /**
   * An array of URL match patterns (as accepted by the MatchPattern
   * class in MatchPattern.webidl) which restrict which pages the actor
   * may be instantiated for. If this is defined, only document URLs which match
   * are allowed to have the given actor created for them. Other documents will
   * fail to have their actor constructed, returning nullptr.
   */
  sequence<DOMString> matches;

  /**
   * An array of MessageManagerGroup values which restrict which type
   * of browser elements the actor is allowed to be loaded within.
   */
  sequence<DOMString> messageManagerGroups;

  /**
   * These fields are used to configure the individual sides of the actor.
   */
  JSActorSidedOptions parent;
  WindowActorChildOptions child;
};

dictionary WindowActorEventListenerOptions : AddEventListenerOptions {
  /**
   * If this attribute is set to true (the default), this event will cause the
   * actor to be created when it is fired. If the attribute is set to false, the
   * actor will not receive the event unless it had already been created through
   * some other mechanism.
   *
   * This should be set to `false` for event listeners which are only intended
   * to perform cleanup operations, and will have no effect if the actor doesn't
   * already exist.
   */
  boolean createActor = true;
};

dictionary WindowActorChildOptions : JSActorSidedOptions {
  /**
   * Events which this actor wants to be listening to. When these events fire,
   * they will trigger actor creation, and then forward the event to the actor.
   *
   * NOTE: Listeners are not attached for windows loaded in chrome docshells.
   *
   * NOTE: The `once` option is not supported because we register listeners in
   * a shared location.
   */
  record<DOMString, WindowActorEventListenerOptions> events;

  /**
   * An array of observer topics to listen to. An observer will be added for
   * each topic in the list.
   *
   * Observer notifications in the list use nsGlobalWindowInner or
   * nsGlobalWindowOuter object as their subject, and the events will only be
   * dispatched to the corresponding window actor. If additional observer
   * notification's subjects are needed, please file a bug for that.
   */
  sequence<ByteString> observers;
};
