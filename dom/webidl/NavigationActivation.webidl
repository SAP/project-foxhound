/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://html.spec.whatwg.org/multipage/nav-history-apis.html#navigationactivation
 */

[Func="Navigation::IsAPIEnabled", Exposed=Window]
interface NavigationActivation {
  [UseCounter] readonly attribute NavigationHistoryEntry? from;
  [UseCounter] readonly attribute NavigationHistoryEntry entry;
  [UseCounter] readonly attribute NavigationType navigationType;
};
