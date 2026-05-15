/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// These types are commonly passed as parameters with the Urlbar code. We
// define them here to avoid having to `@import` them into each module.
// TypeScript will still warn about attempting to call `new UrlbarController()`
// and similar actions because these are only defined as types and not values.

type UrlbarController = import("../UrlbarController.sys.mjs").UrlbarController;
type UrlbarInput = import("../content/UrlbarInput.mjs").UrlbarInput;
type UrlbarQueryContext = import("../UrlbarUtils.sys.mjs").UrlbarQueryContext;
type UrlbarResult = import("../UrlbarResult.sys.mjs").UrlbarResult;

/**
 * A structure that holds the details of commands for results.
 */
type UrlbarResultCommand = {
  /**
   * The name of the command. Must be specified unless `children` is present.
   * When a command is picked, its name will be passed as `details.selType` to
   * `onEngagement()`. The special name "separator" will create a menu separator.
   */
  name?: string;
  /**
   * An l10n object for the command's label. Must be specified unless `name`
   * is "separator".
   */
  l10n?: L10nIdArgs;
  /**
   * If specified, a submenu will be created with the given child commands.
   */
  children?: UrlbarResultCommand[];
};
