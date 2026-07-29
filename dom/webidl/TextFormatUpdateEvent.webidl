/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/edit-context
 */


dictionary TextFormatUpdateEventInit : EventInit {
    sequence<TextFormat> textFormats = [];
};

[Exposed=Window, Pref="dom.editcontext.enabled"]
interface TextFormatUpdateEvent : Event {
    constructor(DOMString type, optional TextFormatUpdateEventInit options = {});
    sequence<TextFormat> getTextFormats();
};
