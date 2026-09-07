const consts = {
  HTML_NS: "http://www.w3.org/1999/xhtml",

  INPUT_ID: "input1",
  FORM1_ID: "form1",
  FORM2_ID: "form2",
  CHANGE_INPUT_ID: "input2",
  BODY_INPUT_ID: "input3",
};

function task(contentConsts) {
  let resolve;
  let promise = new Promise(r => {
    resolve = r;
  });

  function unexpectedContentEvent(evt) {
    Assert.ok(false, "Received a " + evt.type + " event on content");
  }

  let gDoc = content.document;
  let ceh = content.docShell.chromeEventHandler;
  // This event is chrome-only so this listener on gDoc never fires,
  // but kept for parity with the original test's intent.
  gDoc.addEventListener("DOMInputPasswordAdded", unexpectedContentEvent);
  content.setTimeout(test_inputAddOutsideForm, 0);

  function test_inputAddOutsideForm() {
    ceh.addEventListener(
      "DOMInputPasswordAdded",
      test_inputAddOutsideFormHandler
    );
    let input = gDoc.createElementNS(contentConsts.HTML_NS, "input");
    input.setAttribute("type", "password");
    input.setAttribute("id", contentConsts.BODY_INPUT_ID);
    input.setAttribute("data-test", "unique-attribute");
    gDoc.body.appendChild(input);
    info("Done appending the input element to the body");
  }

  function test_inputAddOutsideFormHandler(evt) {
    ceh.removeEventListener(evt.type, test_inputAddOutsideFormHandler);
    Assert.equal(
      evt.target.id,
      contentConsts.BODY_INPUT_ID,
      evt.type +
        " event targets correct input element (added password element outside form)"
    );
    content.setTimeout(test_inputChangesType, 0);
  }

  function test_inputChangesType() {
    ceh.addEventListener("DOMInputPasswordAdded", test_inputChangesTypeHandler);
    let input = gDoc.getElementById(contentConsts.CHANGE_INPUT_ID);
    input.setAttribute("type", "password");
  }

  function test_inputChangesTypeHandler(evt) {
    ceh.removeEventListener(evt.type, test_inputChangesTypeHandler);
    Assert.equal(
      evt.target.id,
      contentConsts.CHANGE_INPUT_ID,
      evt.type + " event targets correct input element (changed type)"
    );
    content.setTimeout(completeTest, 0);
  }

  function completeTest() {
    Assert.ok(true, "Test completed");
    gDoc.removeEventListener("DOMInputPasswordAdded", unexpectedContentEvent);
    resolve();
  }

  return promise;
}

add_task(async function () {
  let tab = (gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser));
  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    `data:text/html;charset=utf-8,
      <html><body>
        <input id="${consts.CHANGE_INPUT_ID}" />
      </body>
      </html>
    `
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  await SpecialPowers.spawn(tab.linkedBrowser, [consts], task);
  gBrowser.removeCurrentTab();
});
