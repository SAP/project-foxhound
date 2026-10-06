/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * An actor architecture designed to allow compositional parent/content
 * communications. The lifetime of a JSProcessActor{Child, Parent} is the `ContentParent`
 * (for the parent-side) / `ContentChild` (for the child-side).
 */

interface nsISupports;

/**
 * Base class for parent-side actor.
 */
[ChromeOnly, Exposed=Window]
interface JSProcessActorParent {
  [ChromeOnly]
  constructor();

  readonly attribute nsIDOMProcessParent manager;
};
JSProcessActorParent includes JSActor;

[ChromeOnly, Exposed=Window]
interface JSProcessActorChild {
  [ChromeOnly]
  constructor();

  readonly attribute nsIDOMProcessChild manager;
};
JSProcessActorChild includes JSActor;


/**
 * Used by `ChromeUtils.registerProcessActor()` to register actors.
 */
dictionary ProcessActorOptions : JSActorOptions {
  /**
   * If this is set to `true`, allow this actor to be created for the parent
   * process.
   */
  boolean includeParent = false;

  /**
   * If true, the actor will be loaded in the loader dedicated to DevTools.
   *
   * This ultimately prevents DevTools from debugging itself.
   */
  boolean loadInDevToolsLoader = false;

  /**
   * These fields are used to configure the individual sides of the actor.
   */
  JSActorSidedOptions parent;
  ProcessActorChildOptions child;
};

dictionary ProcessActorChildOptions : JSActorSidedOptions {
  /**
   * An array of observer topics to listen to. An observer will be added for each
   * topic in the list.
   *
   * Unlike for JSWindowActor, observers are always invoked, and do not need to
   * pass an inner or outer window as subject.
   */
  sequence<ByteString> observers;
};
