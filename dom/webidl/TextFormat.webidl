/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/edit-context
 */

enum UnderlineStyle { "none", "solid", "dotted", "dashed", "wavy" };
enum UnderlineThickness { "none", "thin", "thick" };

dictionary TextFormatInit {
    unsigned long rangeStart = 0;
    unsigned long rangeEnd = 0;
    UnderlineStyle underlineStyle = "none";
    UnderlineThickness underlineThickness = "none";
};

[Exposed=Window, Pref="dom.editcontext.enabled"]
interface TextFormat {
    constructor(optional TextFormatInit options = {});
    readonly attribute unsigned long rangeStart;
    readonly attribute unsigned long rangeEnd;
    readonly attribute UnderlineStyle underlineStyle;
    readonly attribute UnderlineThickness underlineThickness;
};
