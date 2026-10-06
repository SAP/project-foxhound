/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://html.spec.whatwg.org/multipage/nav-history-apis.html#navigationtransition
 */

[Func="Navigation::IsAPIEnabled", Exposed=Window]
interface NavigationTransition {
  [UseCounter] readonly attribute NavigationType navigationType;
  [UseCounter] readonly attribute NavigationHistoryEntry from;
  [UseCounter] readonly attribute Promise<undefined> committed;
  [UseCounter] readonly attribute Promise<undefined> finished;
};
