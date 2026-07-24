/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://html.spec.whatwg.org/#the-pageswapevent-interface
 */

[Exposed=Window, Pref="dom.viewTransitions.cross-document.enabled"]
interface PageSwapEvent : Event {
  constructor(DOMString type, optional PageSwapEventInit eventInitDict = {});
  readonly attribute NavigationActivation? activation;
  readonly attribute ViewTransition? viewTransition;
};

dictionary PageSwapEventInit : EventInit {
  NavigationActivation? activation = null;
  ViewTransition? viewTransition = null;
};
