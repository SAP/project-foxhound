/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/css-view-transitions-2/#cssom
 */

[Exposed=Window, Pref="dom.viewTransitions.cross-document.enabled"]
interface CSSViewTransitionRule : CSSRule {
    readonly attribute UTF8String navigation;

    // TODO use FrozenArray when available. (bug 1236777)
    // [SameObject] readonly attribute FrozenArray<CSSOMString> types;
    [Frozen, Cached, Pure] readonly attribute sequence<UTF8String> types;
};
