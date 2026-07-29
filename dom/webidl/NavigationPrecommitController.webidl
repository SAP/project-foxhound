/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://html.spec.whatwg.org/#the-navigationprecommitcontroller-interface
 */
[Func="Navigation::IsAPIEnabled", Exposed=Window]
interface NavigationPrecommitController {
  [Throws, UseCounter]
  undefined redirect(USVString url, optional NavigationNavigateOptions options = {});
  [Throws, UseCounter]
  undefined addHandler(NavigationInterceptHandler handler);
};

callback NavigationPrecommitHandler = Promise<undefined>(NavigationPrecommitController controller);
