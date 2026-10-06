/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const TEST_URI = URL_ROOT + "doc_browser_fontinspector-variable.html";

add_task(async function () {
  const { inspector, view } = await openFontInspectorForURL(TEST_URI);
  const viewDoc = view.document;

  await testWghtInteract(inspector, viewDoc);
  await testInstanceChange(inspector, viewDoc);
  await testOpszRounded(inspector, viewDoc);
  await testInstanceWghtRounded(inspector, viewDoc);
  await testAxisStepRounded(inspector, viewDoc);
});

async function testWghtInteract(inspector, viewDoc) {
  await selectNode(".weight", inspector);

  const wghtInput = viewDoc.querySelector(`.font-value-input[name="wght"]`);
  is(wghtInput.value, "800", "wght value is 800 before focusing");

  wghtInput.focus();
  await wait(100);

  is(wghtInput.value, "800", "wght value is 800 after focusing");
}

async function testInstanceChange(inspector, viewDoc) {
  await selectNode(".weight", inspector);

  let wghtInput = viewDoc.querySelector(`.font-value-input[name="wght"]`);
  is(wghtInput.value, "800", "wght value is 800 initially");

  const instanceSelect = viewDoc.querySelector(
    "#font-editor .font-value-select"
  );
  instanceSelect.focus();
  await wait(100);

  const ruleView = inspector.getPanel("ruleview").view;
  const onRuleViewChanged = ruleView.once("ruleview-changed");

  const onEditorUpdated = inspector.once("fonteditor-updated");
  EventUtils.sendKey("LEFT", viewDoc.defaultView);

  info("Wait for fonteditor-updated");
  await onEditorUpdated;

  info("Wait for ruleview-changed");
  await onRuleViewChanged;

  wghtInput = viewDoc.querySelector(`.font-value-input[name="wght"]`);
  is(wghtInput.value, "900", "wght value is 900 after selecting new instance");

  wghtInput.focus();
  is(wghtInput.value, "900", "wght value is 900 after focusing");
  wghtInput.blur();
}

async function testOpszRounded(inspector, viewDoc) {
  await selectNode(".rounding", inspector);

  const opszInput = viewDoc.querySelector(`.font-value-input[name="opsz"]`);
  is(opszInput.value, "14.286", "opsz value is rounded after selecting node");

  opszInput.focus();
  is(opszInput.value, "14.286", "opsz value is rounded after focusing");
}

async function testInstanceWghtRounded(inspector, viewDoc) {
  await selectNode(".rounding", inspector);

  let wghtInput = viewDoc.querySelector(`.font-value-input[name="wght"]`);
  is(wghtInput.value, "400", "wght value is 400 initially");

  const instanceSelect = viewDoc.querySelector(
    "#font-editor .font-value-select"
  );
  instanceSelect.focus();
  await wait(100);

  const ruleView = inspector.getPanel("ruleview").view;
  const onRuleViewChanged = ruleView.once("ruleview-changed");

  const onEditorUpdated = inspector.once("fonteditor-updated");
  EventUtils.sendKey("LEFT", viewDoc.defaultView);

  info("Wait for fonteditor-updated");
  await onEditorUpdated;

  info("Wait for ruleview-changed");
  await onRuleViewChanged;

  wghtInput = viewDoc.querySelector(`.font-value-input[name="wght"]`);
  is(
    wghtInput.value,
    "699.444",
    "wght value is rounded after selecting new instance"
  );

  wghtInput.focus();
  await wait(100);
  is(wghtInput.value, "699.444", "wght value is rounded after focusing");
}

async function testAxisStepRounded(inspector, viewDoc) {
  await selectNode(".rounding", inspector);

  const wghtInput = viewDoc.querySelector(`.font-value-input[name="wght"]`);
  is(wghtInput.value, "699.444", "wght value is 699.444 before stepping");

  wghtInput.focus();
  await wait(100);

  const ruleView = inspector.getPanel("ruleview").view;
  const onRuleViewChanged = ruleView.once("ruleview-changed");

  EventUtils.sendKey("DOWN", viewDoc.defaultView);
  is(wghtInput.value, "699.333", "wght value is rounded after stepping down");

  info("Wait for ruleview-changed");
  await onRuleViewChanged;
}
