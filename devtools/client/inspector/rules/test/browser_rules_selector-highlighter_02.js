/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the selector highlighter is shown when clicking on a selector icon
// in the rule-view

const TEST_URI = `
  <style type="text/css">
    body {
      background: red;
    }
    p {
      color: white;
    }

    @scope (.scope-root) to (.scope-limit) {
      .b {
        background-color: hotpink;
      }
    }

    :where(.b) {
      background-color: gold;
    }
  </style>
  <p>Testing the selector highlighter</p>
  <aside class="for-scope">
    <div class="scope-root">
      <article class="b in-scope">article in scope</article>
      <h2 class="b in-scope">h2 in scope</h2>
      <div class="scope-limit">
        <code class="b outside-scope">code after scope limit</code>
      </div>
    </div>
    <section class="b outside-scope">section outside scope</section>
  </aside>
`;

add_task(async function () {
  await pushPref("layout.css.at-scope.enabled", true);

  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  let data;

  info("Clicking once on the body selector highlighter icon");
  data = await clickSelectorIcon(view, "body");
  ok(data.isShown, "The highlighter is shown");

  info("Clicking once again on the body selector highlighter icon");
  data = await clickSelectorIcon(view, "body");
  ok(!data.isShown, "The highlighter is hidden");

  info("Checking that the right NodeFront reference and options are passed");
  await selectNode("p", inspector);
  data = await clickSelectorIcon(view, "p");

  is(
    data.nodeFront.tagName,
    "P",
    "The right NodeFront is passed to the highlighter"
  );
  is(
    data.options.selector,
    "p",
    "The right selector option is passed to the highlighter"
  );
  info("Hide the highlighter for the `p` selector");
  await clickSelectorIcon(view, "p");

  info("Check that the highlighter works for rules in @scope");
  await selectNode("article.in-scope", inspector);

  await clickSelectorIcon(view, ".b");

  // Here we want to check that the selector highlighter is shown for article.b.in-scope and
  // h2.b.in-scope, but not code.b.outside-scope, nor section.b.outside-scope.
  // The event we get from the highlighter doesn't really indicate which elements the highlighter
  // is shown for, so we need to check the highlighter markup directly
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const doc = content.document;

    // Highlighters are rendered in the shadow DOM, let's get the shadow roots first
    const roots = doc.getConnectedShadowRoots();
    const highlightedInfobarContent = roots
      .map(
        root =>
          root.querySelector(
            ".highlighter-container.box-model #box-model-infobar-container"
          )?.textContent
      )
      .filter(text => !!text)
      // The order of highlighter elements in the DOM tree isn't guaranteed,
      // let's sort the selector texts.
      .sort();

    is(
      highlightedInfobarContent.length,
      2,
      "2 selector highlighters are displayed"
    );
    if (highlightedInfobarContent.length != 2) {
      return;
    }

    is(
      highlightedInfobarContent[0],
      "article.b.in-scope",
      "The first highlighter is displayed for the first node in scope"
    );

    is(
      highlightedInfobarContent[1],
      "h2.b.in-scope",
      "The second highlighter is displayed for the second node in scope"
    );
  });
});
