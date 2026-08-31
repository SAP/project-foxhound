/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// https://html.spec.whatwg.org/multipage/interaction.html#the-commandevent-interface
[Exposed=Window]
interface CommandEvent : Event {
  constructor(DOMString type, optional CommandEventInit eventInitDict = {});

  readonly attribute DOMString command;

  readonly attribute Element? source;
};

dictionary CommandEventInit : EventInit {
    Element? source = null;
    DOMString command = "";
};
