/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the anchor badge is displayed on element with expected anchor-name values.

const TEST_URI = `
  <style type="text/css">
    #not-an-anchor {
      anchor-name: none;
    }

    #anchor {
      anchor-name: --my-anchor;
    }

    #anchor-with-multiple-names {
      anchor-name: --my-other-anchor, --anchor-alias;
    }

    .anchored {
      position: fixed;
      left: anchor(right);
      position-anchor: --my-anchor;
      width: 20px;
      height: 20px;
      background-color: gold;
    }
  </style>
  <span id="anchor">--my-anchor</span>
  <span id="anchor-with-multiple-names">--my-other-anchor --anchor-alias</span>
  <span id="not-an-anchor">not an anchor</span>
  <div class="anchored">A</div>
  <div class="anchored" style="position-anchor: --my-other-anchor">B</div>
  <div class="anchored" style="position-anchor: --updated-anchor-name">C</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector } = await openLayoutView();

  let badge = await getAnchorBadgeForSelector("#anchor", inspector);
  ok(!!badge, "anchor badge is displayed for element with valid anchor name");
  is(badge.textContent, "anchor", "badge has expected text");
  is(badge.title, "anchor-name: --my-anchor", "badge has expected title");

  badge = await getAnchorBadgeForSelector(
    "#anchor-with-multiple-names",
    inspector
  );
  ok(
    !!badge,
    "anchor badge is displayed for element with multiple anchor name"
  );
  is(badge.textContent, "anchor", "badge has expected text");
  is(
    badge.title,
    "anchor-name: --my-other-anchor, --anchor-alias",
    "badge has expected title"
  );

  info(
    "Change the element anchorName value to see if the badge title is updated"
  );
  const oldTitle = badge.title;
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    content.document.getElementById(
      "anchor-with-multiple-names"
    ).style.anchorName = "--updated-anchor-name";
  });
  await waitFor(() => badge.title !== oldTitle);

  badge = await getAnchorBadgeForSelector(
    "#anchor-with-multiple-names",
    inspector
  );
  ok(!!badge, "anchor badge is still displayed after changing the anchor name");
  is(
    badge.textContent,
    "anchor",
    "badge has expected text after changing the anchor name"
  );
  is(
    badge.title,
    "anchor-name: --updated-anchor-name",
    "badge has expected title after changing the anchor name"
  );

  info("Set the element anchorName to none to see if the badge gets hidden");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    content.document.getElementById(
      "anchor-with-multiple-names"
    ).style.anchorName = "none";
  });
  await waitFor(
    async () =>
      (await getAnchorBadgeForSelector(
        "#anchor-with-multiple-names",
        inspector
      )) === null,
    "wait for badge to be hidden",
    // interval
    500,
    // max tries
    10
  );
  ok(true, "The badge was hidden when setting anchorName to none");

  info(
    "Change the element anchorName value back to a dashed ident to see if the badge is shown again"
  );
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    content.document.getElementById(
      "anchor-with-multiple-names"
    ).style.anchorName = "--my-other-anchor";
  });
  badge = await waitFor(
    async () =>
      await getAnchorBadgeForSelector("#anchor-with-multiple-names", inspector),
    "wait for badge to be visible",
    // interval
    500,
    // max tries
    10
  );

  ok(
    !!badge,
    "anchor badge is displayed again after setting a valid anchor name"
  );
  is(
    badge.textContent,
    "anchor",
    "badge has expected text after setting a valid anchor name"
  );
  is(
    badge.title,
    "anchor-name: --my-other-anchor",
    "badge has expected title after setting a valid anchor name"
  );

  badge = await getAnchorBadgeForSelector("#not-an-anchor", inspector);
  ok(
    !badge,
    "anchor badge is not displayed for element with anchor-name: none"
  );
});

async function getAnchorBadgeForSelector(selector, inspector) {
  const container = await getContainerForSelector(selector, inspector);
  return container.elt.querySelector(".inspector-badge[data-anchor]");
}
