/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that @position-try rules are displayed in a dedicated section.

const TEST_URI = `https://example.org/document-builder.sjs?html=${encodeURIComponent(`
  <style>
    .anchor {
      anchor-name: --test-anchor;
    }

    .anchored {
      position: fixed;
      position-anchor: --test-anchor;
      color: peachpuff;
    }

    .no-at-position-try {
      position-try: top;
    }

    .unknown-at-position-try {
      position-try: top, --unknown;
    }

    .single-at-position-try {
      position-try: bottom, --custom-bottom;
    }

    .multiple-at-position-try {
      position-try: left, --custom-right,--custom-bottom;
    }

    @position-try --custom-bottom {
      top: anchor(bottom);
      color: gold;
    }

    @position-try --custom-right {
      top: anchor(bottom);
      left: anchor(right);
      left: 10px !important;
      color: tomato;
      --m: 10px;
    }
  </style>
  <main>
    <div class=anchor>⚓️</div>
    <span class="anchored no-at-position-try"></span>
    <span class="anchored unknown-at-position-try"></span>
    <span class="anchored single-at-position-try"></span>
    <span class="anchored multiple-at-position-try"></span>
  </main>
`)}`;

add_task(async function () {
  await pushPref("layout.css.anchor-positioning.enabled", true);
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();

  info(
    "Check that the @property-try section isn't displayed if the at-rules are not used in the position-try declaration"
  );
  await selectNode(".anchored.no-at-position-try", inspector);

  const anchoredClassRuleItem = {
    selector: ".anchored",
    declarations: [
      { name: "position", value: "fixed" },
      { name: "position-anchor", value: "--test-anchor" },
      { name: "color", value: "peachpuff" },
    ],
  };

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: ".no-at-position-try",
      declarations: [{ name: "position-try", value: "top" }],
    },
    anchoredClassRuleItem,
  ]);

  info(
    "Check that the @property-try section isn't displayed if the the position-try value " +
      "refers to an unknown dashed ident"
  );
  await selectNode(".anchored.unknown-at-position-try", inspector);
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: ".unknown-at-position-try",
      declarations: [{ name: "position-try", value: "top, --unknown" }],
    },
    anchoredClassRuleItem,
  ]);

  info(
    "Check that the @property-try section is displayed and has expected content if a" +
      "dashed ident is used in the position-try declaration"
  );
  await selectNode(".anchored.single-at-position-try", inspector);
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: ".single-at-position-try",
      declarations: [
        { name: "position-try", value: "bottom, --custom-bottom" },
      ],
    },
    anchoredClassRuleItem,
    {
      header: `@position-try`,
    },
    {
      selector: "--custom-bottom",
      selectorEditable: false,
      hasSelectorHighlighterButton: false,
      declarations: [
        { name: "top", value: "anchor(bottom)" },
        // we have this here to make sure it's not marked as overridden / does not override
        // color declaration for regular rules.
        { name: "color", value: "gold", inactiveCSS: true },
      ],
    },
  ]);

  info(
    "Check that the @property-try section is displayed and has expected content if multiple " +
      "dashed-ident are used in the position-try declaration"
  );
  await selectNode(".anchored.multiple-at-position-try", inspector);
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: ".multiple-at-position-try",
      declarations: [
        { name: "position-try", value: "left, --custom-right,--custom-bottom" },
      ],
    },
    anchoredClassRuleItem,
    {
      header: `@position-try`,
    },
    {
      selector: "--custom-bottom",
      selectorEditable: false,
      hasSelectorHighlighterButton: false,
      declarations: [
        { name: "top", value: "anchor(bottom)" },
        // we have this here to make sure it's not marked as overridden / does not override
        // color declaration for regular rules.
        { name: "color", value: "gold", inactiveCSS: true },
      ],
    },
    {
      selector: "--custom-right",
      selectorEditable: false,
      hasSelectorHighlighterButton: false,
      declarations: [
        { name: "top", value: "anchor(bottom)" },
        { name: "left", value: "anchor(right)" },
        { name: "left", value: "10px !important", valid: false },
        // we have this here to make sure it's not marked as overridden / does not override
        // color declaration for regular rules.
        { name: "color", value: "tomato", inactiveCSS: true },
        { name: "--m", value: "10px", inactiveCSS: true },
      ],
    },
  ]);

  info("Check that we can filter on the @position-try name");
  await setSearchFilter(view, "--custom-r");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: ".multiple-at-position-try",
      declarations: [
        {
          name: "position-try",
          value: "left, --custom-right,--custom-bottom",
          highlighted: true,
        },
      ],
    },
    {
      header: `@position-try`,
    },
    {
      selector: "--custom-right",
      selectorEditable: false,
      hasSelectorHighlighterButton: false,
      declarations: [
        { name: "top", value: "anchor(bottom)" },
        { name: "left", value: "anchor(right)" },
        { name: "left", value: "10px !important", valid: false },
        { name: "color", value: "tomato", inactiveCSS: true },
        { name: "--m", value: "10px", inactiveCSS: true },
      ],
    },
  ]);

  // TODO: At the moment we display @position-try rules as read-only, but as part of
  // Bug 2004046, we should assert that adding modifying/adding declaration propagates the change
  // stylesheet as expected, and that the declarations of the rules are properly updated.
});
