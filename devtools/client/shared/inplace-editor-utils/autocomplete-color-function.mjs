/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { RECTANGULAR_COLOR_SPACES } = ChromeUtils.importESModule(
  "resource://devtools/client/shared/inplace-editor-utils/constants.mjs"
);

/**
 * Compute the autocomplete data for the passed color() function.
 *
 * @param {object} params
 * @param {Function} params.getCSSValuesForPropertyName: A function that returns a list of
 *        CSS values valid for a provided property name to use for the autocompletion.
 * @param {Array<InspectorCSSToken>} params.functionTokens: The tokens representing the
 *        function parameters (i.e. what's inside the parenthesis)
 * @returns {object} Returns an object of the following shape:
 *            - {Array<string>} list: The list of autocomplete items
 */
export function getAutocompleteDataForColorFunction({
  getCSSValuesForPropertyName,
  functionTokens,
}) {
  let list;
  const tokensCount = functionTokens.length;
  const isLastTokenComplete = !!functionTokens.at(-1)?.complete;

  // the `color()` function can have different syntax:
  // - absolute: color(<color-space> c1 c2 c3[ / A])
  // - relative: color(from <color> <color-space> c1 c2 c3[ / A])

  // we don't get comments or whitespace, so if there's no token or only one that is
  // incomplete, we don't know which `color()` syntax we have yet.
  // We should provide the list of color spaces + "from"
  if (!tokensCount || (tokensCount === 1 && !isLastTokenComplete)) {
    list = RECTANGULAR_COLOR_SPACES.concat("from").sort();
  } else {
    const [firstToken] = functionTokens;
    if (firstToken.tokenType === "Ident" && firstToken.text === "from") {
      if (tokensCount === 1 || (tokensCount === 2 && !isLastTokenComplete)) {
        // we have a relative syntax and no token, or an incomplete one after it,
        // we can show the list of named colors and color functions.
        // TODO: we should also have `var()` and `attr()` (Bug 1900306)
        list = getCSSValuesForPropertyName("color");
      } else if (
        tokensCount === 2 ||
        (tokensCount === 3 && !isLastTokenComplete)
      ) {
        // we have relative syntax and the base the color, we need to show the list
        // of color spaces
        list = Array.from(RECTANGULAR_COLOR_SPACES);
      } else {
        // there is more than 2 tokens, we shouldn't autocomplete
        // TODO: we could display `var()`, `calc()`, `attr()` (Bug 1900306)
        list = [];
      }
    } else {
      // we have an absolute relative syntax with the color space already, don't autocomplete
      // TODO: we could display `var()`, `calc()`, `attr()` (Bug 1900306)
      list = [];
    }
  }

  return { list };
}
