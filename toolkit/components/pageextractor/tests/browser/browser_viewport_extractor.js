/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_viewport_extraction() {
  const { actor, cleanup, tab } = await html`
    <style>
      body {
        margin: 0;
      }
      .page {
        margin-bottom: 20px;
        height: 100vh;
        box-sizing: border-box;
      }
    </style>
    <div class="page" id="page-1">Viewport page 1</div>
    <div class="page" id="page-2">Viewport page 2</div>
    <div class="page" id="page-3">Viewport page 3</div>
  `;

  is(
    (await actor.getText({ justViewport: true })).text,
    "Viewport page 1",
    "Viewport-only extraction returns the first page."
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    content.document.getElementById("page-2").scrollIntoView();
  });

  is(
    (await actor.getText({ justViewport: true })).text,
    "Viewport page 2",
    "Viewport extraction follows the current scroll position."
  );

  is(
    (await actor.getText()).text,
    ["Viewport page 1", "Viewport page 2", "Viewport page 3"].join("\n"),
    "Full document extraction includes all content."
  );

  await cleanup();
});
