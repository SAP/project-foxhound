/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const TEST_URI = URL_ROOT + "doc_browser_fontinspector.html";

add_task(async function () {
  const { inspector, view } = await openFontInspectorForURL(TEST_URI);
  const viewDoc = view.document;

  await testDiv(inspector, viewDoc);
  await testNestedSpan(inspector, viewDoc);
  await testUpdatedValues(inspector, viewDoc);
  await testRoundedValues(inspector, viewDoc);
});

async function testDiv(inspector, viewDoc) {
  await selectNode("DIV", inspector);
  const { value, unit } = getPropertyValue(viewDoc, "font-size");

  is(value + unit, "1em", "DIV should be have font-size of 1em");
}

async function testNestedSpan(inspector, viewDoc) {
  await selectNode(".nested-span", inspector);
  const { value, unit } = getPropertyValue(viewDoc, "font-size");

  isnot(
    value + unit,
    "1em",
    "Nested span should not reflect parent's font size."
  );
  is(
    value + unit,
    "36px",
    "Nested span should have computed font-size of 36px"
  );
}

async function testUpdatedValues(inspector, viewDoc) {
  await selectNode(".updated-value", inspector);
  const sizeInput = viewDoc.querySelector(
    `.font-value-input[name="font-size"]`
  );
  is(sizeInput.value, "1", "font-size value is 1 before editing");

  info("Updating style attribute in markup view");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.document.querySelector(".updated-value").style.fontSize = "2em";
  });
  await inspector.once("fonteditor-updated");
  is(sizeInput.value, "2", "font-size value is 2 after editing");

  const onFocus = once(sizeInput, "focus");
  sizeInput.focus();
  await onFocus;
  is(sizeInput.value, "2", "font-size value is 2 after focusing");
}

async function testRoundedValues(inspector, viewDoc) {
  await selectNode(".rounded-value", inspector);
  const sizeInput = viewDoc.querySelector(
    `.font-value-input[name="font-size"]`
  );
  is(
    sizeInput.value,
    "1.111111",
    "font-size value is not rounded before focusing"
  );

  let onFocus = once(sizeInput, "focus");
  sizeInput.focus();
  await onFocus;
  is(
    sizeInput.value,
    "1.111111",
    "font-size value is not rounded when focused"
  );

  const onEditorUpdated = inspector.once("fonteditor-updated");
  sizeInput.blur();
  await onEditorUpdated;
  is(sizeInput.value, "1.111", "font-size value is rounded when blurred");

  onFocus = once(sizeInput, "focus");
  sizeInput.focus();
  await onFocus;
  is(sizeInput.value, "1.111", "font-size value is rounded when focused again");
}
