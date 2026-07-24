/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * There is some inconsistency in newline handling between the modes. Make all newlines
 * collapse to just spaces.
 *
 * @param {string} text
 */
function normalizeWhitespace(text) {
  return text.replaceAll("\n\n", "\n").replaceAll("\n", " ");
}

add_task(async function test_dom_extractor_reader_mode() {
  const title = "Etymology of Mochitests";
  const article =
    `It's interesting that inside of Mozilla most people call mochitests "moh` +
    `kee tests". I believe this is because it is adjacent to the term` +
    `"mocha tests", which is pronounced with the hard k sound. However, the` +
    `testing infrastructure is named after the delicious Japanese treat known` +
    `as mochi. Mochi, pronounced like "moh chee" is a food that is made from` +
    `pounding steamed rice into a soft elastic mass.`;

  const { cleanup, getPageExtractor } = await html`
    <article>
      <h1>${title}</h1>
      <p>${article}</p>
    </article>
  `;

  const text = `${title} ${article}`;

  is(
    normalizeWhitespace((await getPageExtractor().getText()).text),
    text,
    "Normal page content supports getText"
  );

  is(
    normalizeWhitespace((await getPageExtractor().getReaderModeContent()).text),
    text,
    "Normal page content supports getReaderModeContent"
  );

  await toggleReaderMode();

  is(
    normalizeWhitespace((await getPageExtractor().getText()).text),
    text,
    "about:reader is supported with getText"
  );

  is(
    normalizeWhitespace((await getPageExtractor().getReaderModeContent()).text),
    text,
    "about:reader is supported with getReaderModeContent"
  );

  await cleanup();
});
