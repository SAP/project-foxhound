/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests editing a property name or value and escaping will revert the
// changes and restore the original value.

const TEST_URI = `
  <style type='text/css'>
  #testid {
    background-color: #00F;
  }
  </style>
  <div id='testid'>Styled Node</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView({ overrideDebounce: false });
  await selectNode("#testid", inspector);

  const ruleEditor = getRuleViewRuleEditor(view, 1);
  const prop = getTextProperty(view, 1, { "background-color": "#00F" });
  const propEditor = prop.editor;

  await focusEditableField(view, propEditor.nameSpan);
  await sendKeysAndWaitForFocus(view, ruleEditor.element, ["DELETE", "ESCAPE"]);

  is(
    propEditor.nameSpan.textContent,
    "background-color",
    "'background-color' property name is correctly set."
  );
  is(
    await getComputedStyleProperty("#testid", null, "background-color"),
    "rgb(0, 0, 255)",
    "#00F background color is set."
  );

  const editor = await focusEditableField(view, propEditor.valueSpan);
  info("Delete input value");
  const onValueDeleted = view.once("ruleview-changed");
  EventUtils.sendKey("DELETE", view.styleWindow);
  await onValueDeleted;

  is(editor.input.value, "", "value input is empty");

  await waitFor(() => view.popup?.isOpen);
  ok(true, "autocomplete popup opened");

  info("Hide autocomplete popup");
  const onPopupClosed = once(view.popup, "popup-closed");
  EventUtils.sendKey("ESCAPE", view.styleWindow);
  await onPopupClosed;
  ok(true, "popup was closed");

  info("Cancel edit with escape key");
  const onRuleViewChanged = view.once("ruleview-changed");
  EventUtils.sendKey("ESCAPE", view.styleWindow);
  await onRuleViewChanged;

  is(
    propEditor.valueSpan.textContent,
    "#00F",
    "'#00F' property value is correctly set."
  );
  is(
    await getComputedStyleProperty("#testid", null, "background-color"),
    "rgb(0, 0, 255)",
    "#00F background color is set."
  );

  ok(!propEditor.warning, "warning icon is hidden after cancelling the edit");
});

const TEST_URI_BLUR = `
  <style type='text/css'>
  #testid {
    background-color: #CFF;
  }
  </style>
  <input id='testid'></div>
`;

add_task(async function testCancelOnBlur() {
  await addTab(
    "data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI_BLUR)
  );

  info("Initially move the focus in the input");
  Services.focus.setFocus(gBrowser.selectedBrowser, Services.focus.FLAG_BYKEY);
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    const input = content.document.querySelector("input");
    Services.focus.setFocus(input, Services.focus.FLAG_BYKEY);
  });

  info("Open DevTools and start editing a value in the rule view");
  const { inspector, view } = await openRuleView({ overrideDebounce: false });
  await selectNode("#testid", inspector);
  const prop = getTextProperty(view, 1, { "background-color": "#CFF" });
  const propEditor = prop.editor;
  await focusEditableField(view, propEditor.valueSpan);

  // Note: Using Services.focus here, but in theory this is more likely to be
  // triggered via a click in the content page. But our various helpers to
  // simulate events don't seem to trigger the expected blur from DevTools.
  info("Move the focus back to the content page");
  const onRuleviewChanged = view.once("ruleview-changed");
  Services.focus.setFocus(gBrowser.selectedBrowser, Services.focus.FLAG_BYKEY);
  await onRuleviewChanged;
  await wait(1000);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    const input = content.document.querySelector("input");
    ok(content.document.hasFocus(), "The content document is still focused");
    is(content.document.activeElement, input, "The input is still focused");
  });
});
