/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/edit-context
 */

dictionary CharacterBoundsUpdateEventInit : EventInit {
    unsigned long rangeStart = 0;
    unsigned long rangeEnd = 0;
};

[Exposed=Window, Pref="dom.editcontext.enabled"]
interface CharacterBoundsUpdateEvent : Event {
    constructor(DOMString type, optional CharacterBoundsUpdateEventInit options = {});
    readonly attribute unsigned long rangeStart;
    readonly attribute unsigned long rangeEnd;
};
