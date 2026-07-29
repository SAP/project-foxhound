/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/edit-context
 */


dictionary TextUpdateEventInit : EventInit {
    unsigned long updateRangeStart = 0;
    unsigned long updateRangeEnd = 0;
    DOMString text = "";
    unsigned long selectionStart = 0;
    unsigned long selectionEnd = 0;
};

[Exposed=Window, Pref="dom.editcontext.enabled"]
interface TextUpdateEvent : Event {
    constructor(DOMString type, optional TextUpdateEventInit options = {});
    readonly attribute unsigned long updateRangeStart;
    readonly attribute unsigned long updateRangeEnd;
    readonly attribute DOMString text;
    readonly attribute unsigned long selectionStart;
    readonly attribute unsigned long selectionEnd;
};
