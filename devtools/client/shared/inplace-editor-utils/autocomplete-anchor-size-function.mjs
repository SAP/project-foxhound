/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ANCHOR_SIZES = [
  "block",
  "height",
  "inline",
  "self-block",
  "self-inline",
  "width",
];

/**
 * Compute the autocomplete data for the passed anchor-size() function.
 *
 * @param {object} params
 * @param {Array<InspectorCSSToken>} params.functionTokens: The tokens representing the
 *        function parameters (i.e. what's inside the parenthesis)
 * @param {Array<string>} params.anchorNames: A list of anchor names.
 * @returns {object} Returns an object of the following shape:
 *            - {Array<string>} list: The list of autocomplete items
 */
export function getAutocompleteDataForAnchorSizeFunction({
  functionTokens,
  anchorNames,
}) {
  // <anchor-size()> =
  //   anchor-size( [ <anchor-name> || <anchor-size> ]? , <length-percentage>? )
  // <anchor-size> =
  //   width        |
  //   height       |
  //   block        |
  //   inline       |
  //   self-block   |
  //   self-inline

  const list = [];
  const lastToken = functionTokens.at(-1);
  const isLastTokenComplete = !!lastToken?.complete;
  let hasComma = false;
  // For the first token of the function, we can have an anchor name or an anchor size
  let waitingForAnchorSize = true;
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
      waitingForAnchorSize &&
      tokenType === "Ident" &&
      ANCHOR_SIZES.includes(text)
    ) {
      waitingForAnchorSize = false;
      continue;
    }

    // Once we have a comma, we don't want to wait for anything
    if (tokenType === "Comma") {
      hasComma = true;
      waitingForAnchorSize = false;
      waitingForAnchorName = false;
      continue;
    }
  }

  if (waitingForAnchorName && anchorNames) {
    list.push(...anchorNames);
  }

  if (waitingForAnchorSize) {
    list.push(...ANCHOR_SIZES);
  }

  return { list };
}
