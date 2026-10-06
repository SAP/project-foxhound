/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// https rather than chrome to improve coverage
const TESTCASE_URI = TEST_BASE_HTTPS + "media-rules.html";
const SIDEBAR_PREF = "devtools.styleeditor.showAtRulesSidebar";

const RESIZE_W = 300;
const RESIZE_H = 450;
const LABELS = [
  "not all",
  "all",
  "(max-width: 550px)",
  "(min-height: 300px) and (max-height: 320px)",
  "(max-width: 750px)",
  "",
  "print",
];
const LINE_NOS = [1, 7, 19, 25, 31, 34, 39];
const NEW_RULE = `
  @media (max-width: 750px) {
    div {
      color: blue;
      @layer {
        border-color: tomato;
      }
    }

    @media print {
      body {
        filter: grayscale(100%);
      }
    }
  }`;

waitForExplicitFinish();

add_task(async function () {
  // Enable @property rules
  await pushPref("layout.css.properties-and-values.enabled", true);
  // Enable anchor positioning
  await pushPref("layout.css.anchor-positioning.enabled", true);
  // Enable @custom-media
  await pushPref("layout.css.custom-media.enabled", true);

  const { ui } = await openStyleEditorForURL(TESTCASE_URI);

  is(ui.editors.length, 4, "correct number of editors");

  info("Test first plain css editor");
  const plainEditor = ui.editors[0];
  await openEditor(plainEditor);
  testPlainEditor(plainEditor);

  info("Test editor for inline sheet with at-rules");
  const inlineAtRulesEditor = ui.editors[3];
  await openEditor(inlineAtRulesEditor);
  await testInlineAtRulesEditor(ui, inlineAtRulesEditor);

  info("Test editor with @media rules");
  const mediaEditor = ui.editors[1];
  await openEditor(mediaEditor);
  await testMediaEditor(ui, mediaEditor);

  info("Test that sidebar hides when flipping pref");
  await testShowHide(ui, mediaEditor);

  info("Test adding a rule updates the list");
  await testMediaRuleAdded(ui, mediaEditor);

  info("Test resizing and seeing @media matching state change");
  const originalWidth = window.outerWidth;
  const originalHeight = window.outerHeight;

  const onMatchesChange = ui.once("at-rules-list-changed");
  window.resizeTo(RESIZE_W, RESIZE_H);
  await onMatchesChange;

  testMediaMatchChanged(mediaEditor);

  window.resizeTo(originalWidth, originalHeight);
});

function testPlainEditor(editor) {
  const sidebar = editor.details.querySelector(".stylesheet-sidebar");
  is(sidebar.hidden, true, "sidebar is hidden on editor without @media");
}

async function testInlineAtRulesEditor(ui, editor) {
  const sidebar = editor.details.querySelector(".stylesheet-sidebar");
  is(sidebar.hidden, false, "sidebar is showing on editor with @media");

  const entries = sidebar.querySelectorAll(".at-rule-label");
  is(entries.length, 16, "16 at-rules displayed in sidebar");

  await testRule({
    ui,
    editor,
    rule: entries[0],
    conditionText: "screen",
    matches: true,
    line: 2,
    type: "media",
  });

  await testRule({
    ui,
    editor,
    rule: entries[1],
    conditionText: "(display: flex)",
    line: 7,
    type: "support",
  });

  await testRule({
    ui,
    editor,
    rule: entries[2],
    conditionText: "(1px < height < 10000px)",
    matches: true,
    line: 8,
    type: "media",
  });

  await testRule({
    ui,
    editor,
    rule: entries[3],
    line: 16,
    type: "layer",
    layerName: "myLayer",
  });

  await testRule({
    ui,
    editor,
    rule: entries[4],
    conditionText: "(min-width: 1px)",
    line: 17,
    type: "container",
  });

  await testRule({
    ui,
    editor,
    rule: entries[5],
    conditionText: "selector(&)",
    line: 21,
    type: "support",
  });

  await testRule({
    ui,
    editor,
    rule: entries[6],
    conditionText: "--my-container (height > 42px)",
    line: 29,
    type: "container",
  });

  await testRule({
    ui,
    editor,
    rule: entries[7],
    conditionText: "--my-container",
    line: 31,
    type: "container",
  });

  await testRule({
    ui,
    editor,
    rule: entries[8],
    line: 33,
    type: "property",
    propertyName: "--my-property",
  });

  await testRule({
    ui,
    editor,
    rule: entries[9],
    line: 39,
    type: "position-try",
    positionTryName: "--pt-custom-bottom",
  });

  await testRule({
    ui,
    editor,
    rule: entries[10],
    line: 45,
    type: "custom-media",
    customMediaName: "--mobile-breakpoint",
    customMediaQuery: [
      { text: "(width < 320px) and (height < 1420px)" },
      { text: ", " },
      { text: "not print" },
    ],
  });

  await testRule({
    ui,
    editor,
    rule: entries[11],
    line: 46,
    type: "custom-media",
    customMediaName: "--enabled",
    customMediaQuery: [{ text: "true" }],
  });

  await testRule({
    ui,
    editor,
    rule: entries[12],
    line: 47,
    type: "custom-media",
    customMediaName: "--disabled",
    customMediaQuery: [{ text: "false", matches: false }],
  });

  await testRule({
    ui,
    editor,
    rule: entries[13],
    line: 52,
    type: "media",
    conditionText: "(--mobile-breakpoint)",
    matches: false,
  });

  await testRule({
    ui,
    editor,
    rule: entries[14],
    line: 56,
    type: "media",
    conditionText: "(--enabled)",
    matches: false,
  });

  await testRule({
    ui,
    editor,
    rule: entries[15],
    line: 60,
    type: "media",
    conditionText: "(--disabled)",
    matches: false,
  });
}

async function testMediaEditor(ui, editor) {
  const sidebar = editor.details.querySelector(".stylesheet-sidebar");
  is(sidebar.hidden, false, "sidebar is showing on editor with @media");

  const entries = [...sidebar.querySelectorAll(".at-rule-label")];
  is(entries.length, 4, "four @media rules displayed in sidebar");

  await testRule({
    ui,
    editor,
    rule: entries[0],
    conditionText: LABELS[0],
    matches: false,
    line: LINE_NOS[0],
  });
  await testRule({
    ui,
    editor,
    rule: entries[1],
    conditionText: LABELS[1],
    matches: true,
    line: LINE_NOS[1],
  });
  await testRule({
    ui,
    editor,
    rule: entries[2],
    conditionText: LABELS[2],
    matches: false,
    line: LINE_NOS[2],
  });
  await testRule({
    ui,
    editor,
    rule: entries[3],
    conditionText: LABELS[3],
    matches: false,
    line: LINE_NOS[3],
  });
}

function testMediaMatchChanged(editor) {
  const sidebar = editor.details.querySelector(".stylesheet-sidebar");

  const cond = sidebar.querySelectorAll(".at-rule-condition")[2];
  is(
    cond.textContent,
    "(max-width: 550px)",
    "third rule condition text is correct"
  );
  ok(
    !cond.classList.contains("media-condition-unmatched"),
    "media rule is now matched after resizing"
  );
}

async function testShowHide(ui, editor) {
  let sidebarChange = ui.once("at-rules-list-changed");
  Services.prefs.setBoolPref(SIDEBAR_PREF, false);
  await sidebarChange;

  const sidebar = editor.details.querySelector(".stylesheet-sidebar");
  is(sidebar.hidden, true, "sidebar is hidden after flipping pref");

  sidebarChange = ui.once("at-rules-list-changed");
  Services.prefs.clearUserPref(SIDEBAR_PREF);
  await sidebarChange;

  is(sidebar.hidden, false, "sidebar is showing after flipping pref back");
}

async function testMediaRuleAdded(ui, editor) {
  await editor.getSourceEditor();
  const sidebar = editor.details.querySelector(".stylesheet-sidebar");
  is(
    sidebar.querySelectorAll(".at-rule-label").length,
    4,
    "4 @media rules after changing text"
  );

  let text = editor.sourceEditor.getText();
  text += NEW_RULE;

  const listChange = ui.once("at-rules-list-changed");
  editor.sourceEditor.setText(text);
  await listChange;

  const entries = [...sidebar.querySelectorAll(".at-rule-label")];
  is(entries.length, 7, "7 @media rules after changing text");

  await testRule({
    ui,
    editor,
    rule: entries[4],
    conditionText: LABELS[4],
    matches: false,
    line: LINE_NOS[4],
  });

  await testRule({
    ui,
    editor,
    rule: entries[5],
    type: "layer",
    conditionText: LABELS[5],
    line: LINE_NOS[5],
  });

  await testRule({
    ui,
    editor,
    rule: entries[6],
    conditionText: LABELS[6],
    matches: false,
    line: LINE_NOS[6],
  });
}

/**
 * Run assertion on given rule
 *
 * @param {object} options
 * @param {StyleEditorUI} options.ui
 * @param {StyleSheetEditor} options.editor: The editor the rule is displayed in
 * @param {Element} options.rule: The rule element in the media sidebar
 * @param {string} options.conditionText: at-rule condition text (for @media, @container, @support)
 * @param {boolean} options.matches: Whether or not the document matches the rule
 * @param {string} options.layerName: Optional name of the @layer
 * @param {string} options.positionTryName: Name of the @position-try if type is "position-try"
 * @param {string} options.propertyName: Name of the @property if type is "property"
 * @param {string} options.customMediaName: Name of the @custom-media if type is "custom-media"
 * @param {Array<object>} options.customMediaQuery: query parts of the @custom-media if type is "custom-media"
 * @param {string} options.customMediaQuery[].text: the query string of the part of the @custom-media
 *        if type is "custom-media"
 * @param {boolean} options.customMediaQuery[].matches: whether or not this part is style as matching,
 *        if type is "custom-media". Defaults to true.
 * @param {number} options.line: Line of the rule
 * @param {string} options.type: The type of the rule (container, layer, media, support, property ).
 *                               Defaults to "media".
 */
async function testRule({
  ui,
  editor,
  rule,
  conditionText = "",
  matches,
  layerName,
  positionTryName,
  propertyName,
  customMediaName,
  customMediaQuery,
  line,
  type = "media",
}) {
  const atTypeEl = rule.querySelector(".at-rule-type");
  let name;
  if (type === "layer") {
    name = layerName;
  } else if (type === "property") {
    name = propertyName;
  } else if (type === "position-try") {
    name = positionTryName;
  }

  if (type === "custom-media") {
    const atTypeChilNodes = Array.from(atTypeEl.childNodes);
    is(
      atTypeChilNodes.shift().textContent,
      `@custom-media\u00A0`,
      "label for @custom-media is correct"
    );
    is(
      atTypeChilNodes.shift().textContent,
      `${customMediaName} `,
      "name for @custom-media is correct"
    );
    is(
      atTypeChilNodes.length,
      customMediaQuery.length,
      `Got expected number of children of @custom-media (got ${JSON.stringify(atTypeChilNodes.map(n => n.textContent))})`
    );
    for (let i = 0; i < atTypeChilNodes.length; i++) {
      const node = atTypeChilNodes[i];
      is(
        node.textContent,
        customMediaQuery[i].text,
        `Got expected text for part #${i} of @custom-media`
      );
      if (customMediaQuery[i].matches ?? true) {
        ok(
          // handle TextNode
          !node.classList ||
            !node.classList.contains("media-condition-unmatched"),
          `Text for part #${i} of @custom-media ("${node.textContent}") does not have unmatching class`
        );
      } else {
        ok(
          node.classList.contains("media-condition-unmatched"),
          `Text for part #${i} of @custom-media ("${node.textContent}") has expected unmatching class`
        );
      }
    }
  } else {
    is(
      atTypeEl.textContent,
      `@${type}\u00A0${name ? `${name}\u00A0` : ""}`,
      "label for at-rule type is correct"
    );
  }

  const cond = rule.querySelector(".at-rule-condition");
  is(
    cond.textContent,
    conditionText,
    "condition label is correct for " + conditionText
  );

  if (type == "media") {
    const matched = !cond.classList.contains("media-condition-unmatched");
    ok(
      matches ? matched : !matched,
      "media rule is " + (matches ? "matched" : "unmatched")
    );
  }

  const ruleLine = rule.querySelector(".at-rule-line");
  is(ruleLine.textContent, ":" + line, "correct line number shown");

  info(
    "Check that clicking on the rule jumps to the expected position in the stylesheet"
  );
  rule.click();
  await waitFor(
    () =>
      ui.selectedEditor == editor &&
      editor.sourceEditor.getCursor().line == line - 1
  );
  ok(true, "Jumped to the expected location");
}

/* Helpers */

function openEditor(editor) {
  getLinkFor(editor).click();

  return editor.getSourceEditor();
}

function getLinkFor(editor) {
  return editor.summary.querySelector(".stylesheet-name");
}
