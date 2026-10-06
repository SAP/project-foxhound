/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {
  HUE_INTERPOLATION_METHODS,
  POLAR_COLOR_SPACE,
  RECTANGULAR_COLOR_SPACES,
} = ChromeUtils.importESModule(
  "resource://devtools/client/shared/inplace-editor-utils/constants.mjs"
);

const SIDE_OR_CORNERS_BLOCK = ["bottom", "top"];
const SIDE_OR_CORNERS_INLINE = ["left", "right"];
const SIDE_OR_CORNERS = SIDE_OR_CORNERS_BLOCK.concat(
  SIDE_OR_CORNERS_INLINE
).sort();

/**
 * Compute the autocomplete data for the passed (repeating-)linear-gradient function.
 *
 * @param {object} params
 * @param {Function} params.getCSSValuesForPropertyName: A function that returns a list of
 *        CSS values valid for a provided property name to use for the autocompletion.
 * @param {Array<InspectorCSSToken>} params.functionTokens: The tokens representing the
 *        function parameters (i.e. what's inside the parenthesis)
 * @returns {object} Returns an object of the following shape:
 *            - {Array<string>} list: The list of autocomplete items
 */
// eslint-disable-next-line complexity
export function getAutocompleteDataForLinearGradientFunction({
  getCSSValuesForPropertyName,
  functionTokens,
}) {
  /*
    linear-gradient(): https://drafts.csswg.org/css-images-4/#linear-gradients

    <linear-gradient-syntax> =
      [ [ <angle> | <zero> | to <side-or-corner> ] || <color-interpolation-method> ]? ,
      <color-stop-list>
    <side-or-corner> = [left | right] || [top | bottom]
    <color-space> = <rectangular-color-space> | <polar-color-space>
    <rectangular-color-space> = srgb | srgb-linear | display-p3 | display-p3-linear | a98-rgb | prophoto-rgb | rec2020 | lab | oklab | <xyz-space>
    <polar-color-space> = hsl | hwb | lch | oklch
    <hue-interpolation-method> = [ shorter | longer | increasing | decreasing ] hue
    <color-interpolation-method> = in [ <rectangular-color-space> | <polar-color-space> <hue-interpolation-method>? ]
  */

  const list = [];
  const lastToken = functionTokens.at(-1);
  const isLastTokenComplete = !!lastToken?.complete;

  // The linear gradient can have multiple syntaxes, with optional parts, so let's
  // go through all the tokens to see in which state we are.
  let hasAngleOrZero;
  let hasComma = false;
  let hasInKeyword = false;
  let hasToKeyword = false;
  let lastSideOrCorner;
  // For the first token of the function, we can directly have colors
  let waitingForColor = true;
  let waitingForColorInterpolation;
  let waitingForHueInterpolationMethod;
  let waitingForHueKeyword;
  // For the first token of the function, we can have "in" (for <color-interpolation-method>)
  let waitingForInKeyWord = true;
  let waitingForSecondSideOrCorner;
  let waitingForSideOrCorner;
  // For the first token of the function, we can have "to" (for <side-or-corner>)
  let waitingForToKeyWord = true;

  for (const token of functionTokens) {
    // Don't handle last token if it's not complete
    if (token === lastToken && !isLastTokenComplete) {
      continue;
    }

    const { tokenType, text } = token;

    if (
      // If we have an ident
      tokenType === "Ident" ||
      // or an hexcolor (#123 is a Hash, #abc is a IDHash, even if it describes a color)
      tokenType === "Hash" ||
      tokenType === "IDHash"
    ) {
      // we shouldn't autocomplete with colors
      waitingForColor = false;
      // In case we have an Ident, we shouldn't wait for in/to anymore
      waitingForInKeyWord = false;
      waitingForToKeyWord = false;
    }

    if (
      !hasComma &&
      !hasAngleOrZero &&
      (tokenType === "Number" || tokenType === "Dimension")
    ) {
      hasAngleOrZero = true;

      // After a number, we can only have `in`, or a comma
      waitingForInKeyWord = true;
      waitingForToKeyWord = false;
      waitingForColor = false;
      continue;
    }

    // For `to <side-or-corner>`
    if (!hasComma && tokenType === "Ident" && text === "to") {
      waitingForSideOrCorner = true;
      hasToKeyword = true;

      waitingForInKeyWord = false;
      waitingForToKeyWord = false;
      waitingForColorInterpolation = false;
      waitingForHueInterpolationMethod = false;
      waitingForHueKeyword = false;
      continue;
    }

    // At this point, we have `to`, we expect side or corners
    if (
      !hasComma &&
      waitingForSideOrCorner &&
      tokenType === "Ident" &&
      SIDE_OR_CORNERS.includes(text)
    ) {
      waitingForSideOrCorner = false;
      waitingForSecondSideOrCorner = true;
      lastSideOrCorner = text;
      // After a single side/corner, we can have the color space
      waitingForInKeyWord = !hasInKeyword;
      continue;
    }

    // At this point, we have `to` + a single side or corner, for example `to left`,
    // we can still have another side or corner
    if (
      !hasComma &&
      waitingForSecondSideOrCorner &&
      tokenType === "Ident" &&
      SIDE_OR_CORNERS.includes(text)
    ) {
      waitingForSecondSideOrCorner = false;
      // After the side/corner, we can have the color space
      waitingForInKeyWord = !hasInKeyword;
      continue;
    }

    // For `<color-interpolation-method>`
    // If we have `in`, we're expecting color spaces
    if (!hasComma && tokenType === "Ident" && text === "in") {
      hasInKeyword = true;
      waitingForColorInterpolation = true;
      waitingForSideOrCorner = false;
      waitingForInKeyWord = false;
      lastSideOrCorner = null;
      continue;
    }

    // At this point, we have `in` + a rectangular color space, for example `in srgb`,
    // `<color-interpolation-method>` is complete
    if (
      !hasComma &&
      waitingForColorInterpolation &&
      tokenType === "Ident" &&
      RECTANGULAR_COLOR_SPACES.includes(text)
    ) {
      waitingForColorInterpolation = false;
      // After the color space, we can have the side/corners
      waitingForToKeyWord = !hasToKeyword;
      continue;
    }

    // At this point, we have `in` + a polar color space, for example `in hsl`,
    // we're expecting the <hue-interpolation-method>
    if (
      !hasComma &&
      waitingForColorInterpolation &&
      tokenType === "Ident" &&
      POLAR_COLOR_SPACE.includes(text)
    ) {
      waitingForColorInterpolation = false;
      waitingForHueInterpolationMethod = true;

      // The <hue-interpolation-method> is optional, so we can have the "to" keyword
      // after just the polar color space
      waitingForToKeyWord = !hasToKeyword;
      continue;
    }

    if (
      !hasComma &&
      waitingForHueInterpolationMethod &&
      tokenType === "Ident"
    ) {
      waitingForHueInterpolationMethod = false;
      // The <hue-interpolation-method> is optional, but in the case we got it,
      // now we'll expect the "hue" keyword
      if (HUE_INTERPOLATION_METHODS.includes(text)) {
        waitingForHueKeyword = true;
      }
    }

    // At this point, we have `in` + a polar color space + interpolation method + "hue",
    // for example `in hsl longer hue`, so `<color-interpolation-method>` is complete
    if (
      !hasComma &&
      waitingForHueKeyword &&
      tokenType === "Ident" &&
      text === "hue"
    ) {
      waitingForHueKeyword = false;

      // After the color space, we can have the side/corners
      waitingForToKeyWord = !hasToKeyword;
      continue;
    }

    if (tokenType === "Comma") {
      hasComma = true;
      // If we're after a comma, the function only expects color stops
      waitingForColor = true;

      waitingForColorInterpolation = false;
      waitingForHueInterpolationMethod = false;
      waitingForHueKeyword = false;
      waitingForInKeyWord = false;
      waitingForSecondSideOrCorner = false;
      waitingForSideOrCorner = false;
      waitingForToKeyWord = false;
      continue;
    }
  }

  // Now that we went over all the tokens, we can populate the list of suggestions
  // based on the waiting* variables

  if (waitingForColor) {
    list.push(...getCSSValuesForPropertyName("color"));
  }
  if (waitingForSideOrCorner) {
    list.push(...SIDE_OR_CORNERS);
  }
  if (waitingForSecondSideOrCorner && lastSideOrCorner) {
    // if the last complete token is a side or corner, and we only have one side or corner,
    // we should provide the other <side-or-corner>
    list.push(
      ...(SIDE_OR_CORNERS_BLOCK.includes(lastSideOrCorner)
        ? SIDE_OR_CORNERS_INLINE
        : SIDE_OR_CORNERS_BLOCK)
    );
  }
  if (waitingForInKeyWord) {
    list.push("in");
  }
  if (waitingForToKeyWord) {
    list.push("to");
  }
  if (waitingForHueKeyword) {
    list.push("hue");
  }
  if (waitingForColorInterpolation) {
    list.push(...RECTANGULAR_COLOR_SPACES, ...POLAR_COLOR_SPACE);
  }
  if (waitingForHueInterpolationMethod) {
    list.push(...HUE_INTERPOLATION_METHODS);
  }

  // the autocomplete mechanism expect the list to be sorted
  list.sort();

  return { list };
}
