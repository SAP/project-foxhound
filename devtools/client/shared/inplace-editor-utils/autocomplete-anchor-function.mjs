/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ANCHOR_SIDES = [
  "bottom",
  "center",
  "end",
  "inside",
  "left",
  "outside",
  "right",
  "self-end",
  "self-start",
  "start",
  "top",
];

/**
 * Compute the autocomplete data for the passed anchor() function.
 *
 * @param {object} params
 * @param {Array<InspectorCSSToken>} params.functionTokens: The tokens representing the
 *        function parameters (i.e. what's inside the parenthesis)
 * @param {Array<string>} params.anchorNames: A list of anchor names.
 * @returns {object} Returns an object of the following shape:
 *            - {Array<string>} list: The list of autocomplete items
 */
export function getAutocompleteDataForAnchorFunction({
  functionTokens,
  anchorNames,
}) {
  // <anchor()> = anchor( <anchor-name>? && <anchor-side>, <length-percentage>? )
  // <anchor-side> = inside | outside
  // | top | left | right | bottom
  // | start | end | self-start | self-end
  // | <percentage> | center

  const list = [];
  const lastToken = functionTokens.at(-1);
  const isLastTokenComplete = !!lastToken?.complete;
  let hasComma = false;
  // For the first token of the function, we can have an anchor name or an anchor side
  let waitingForAnchorSide = true;
  let waitingForAnchorName = true;

  for (const token of functionTokens) {
    // Don't handle last token if it's not complete
    if (token === lastToken && !isLastTokenComplete) {
      continue;
    }

    const { tokenType, text } = token;

    if (
      !hasComma &&
      waitingForAnchorName &&
      tokenType === "Ident" &&
      text.startsWith("--")
    ) {
      waitingForAnchorName = false;
      continue;
    }

    if (
      !hasComma &&
      waitingForAnchorSide &&
      tokenType === "Ident" &&
      ANCHOR_SIDES.includes(text)
    ) {
      waitingForAnchorSide = false;
      continue;
    }

    // Once we have a comma, we don't want to wait for anything
    if (tokenType === "Comma") {
      hasComma = true;
      waitingForAnchorSide = false;
      waitingForAnchorName = false;
      continue;
    }
  }

  if (waitingForAnchorName && anchorNames) {
    list.push(...anchorNames);
  }

  if (waitingForAnchorSide) {
    list.push(...ANCHOR_SIDES);
  }

  return { list };
}
