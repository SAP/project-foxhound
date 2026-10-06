/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that empty attributes are displayed correctly

const SCHEMA = "data:text/html;charset=UTF-8,";
const TEST_URL = `${SCHEMA}<!DOCTYPE html>
  <html>
  <body>
    <input id="no-value" type="checkbox" checked />
    <input id="empty-value" type="checkbox" checked="" />
    <input id="value" type="checkbox" checked="true" />
  </body>
  </html>`;

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URL);

  await testNoValue(inspector);
  await testEmptyValue(inspector);
  await testValue(inspector);
});

async function testNoValue(inspector) {
  const { editor } = await getContainerForSelector("#no-value", inspector);
  is(
    editor.attrList.textContent.trim(),
    `id="no-value" type="checkbox" checked`,
    "attribute with no value ('checked') is displayed correctly"
  );

  const attr = editor.attrElements.get("checked").querySelector(".editable");
  attr.focus();
  EventUtils.sendKey("return", inspector.panelWin);
  is(
    inplaceEditor(attr).input.value,
    `checked=""`,
    `attribute with no value ('checked') shows ="" when editing`
  );
  EventUtils.sendKey("escape", inspector.panelWin);

  const mutated = inspector.once("markupmutation");
  setEditableFieldValue(attr, 'checked="true"', inspector);
  await mutated;
  is(
    editor.attrList.textContent.trim(),
    `id="no-value" type="checkbox" checked="true"`,
    `attribute which had no value ('checked') is displayed correctly after setting a value ('checked="true"')`
  );
}

async function testEmptyValue(inspector) {
  const { editor } = await getContainerForSelector("#empty-value", inspector);
  is(
    editor.attrList.textContent.trim(),
    `id="empty-value" type="checkbox" checked`,
    `attribute with empty value ('checked=""') is displayed correctly`
  );

  const attr = editor.attrElements.get("checked").querySelector(".editable");
  attr.focus();
  EventUtils.sendKey("return", inspector.panelWin);
  is(
    inplaceEditor(attr).input.value,
    `checked=""`,
    `attribute with empty value ('checked=""') shows ="" when editing`
  );
  EventUtils.sendKey("escape", inspector.panelWin);

  const mutated = inspector.once("markupmutation");
  setEditableFieldValue(attr, "checked", inspector);
  await mutated;
  is(
    editor.attrList.textContent.trim(),
    `id="empty-value" type="checkbox" checked`,
    `attribute which had empty value ('checked=""') is displayed correctly after removing the value ('checked')`
  );
}

async function testValue(inspector) {
  const { editor } = await getContainerForSelector("#value", inspector);
  is(
    editor.attrList.textContent.trim(),
    `id="value" type="checkbox" checked="true"`,
    `attribute with value ('checked="true"') is displayed correctly`
  );

  const attr = editor.attrElements.get("checked").querySelector(".editable");
  const mutated = inspector.once("markupmutation");
  setEditableFieldValue(attr, 'checked=""', inspector);
  await mutated;
  is(
    editor.attrList.textContent.trim(),
    `id="value" type="checkbox" checked`,
    `attribute which had value ('checked="true"') is displayed correctly after making the value empty ('checked=""')`
  );
}
