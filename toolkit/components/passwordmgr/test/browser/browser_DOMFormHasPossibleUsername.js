const ids = {
  INPUT_ID: "input1",
  FORM1_ID: "form1",
  FORM2_ID: "form2",
  CHANGE_INPUT_ID: "input2",
  INPUT_TYPE: "",
};

function task({ contentIds, expected, hasForm = true }) {
  let resolve;
  let promise = new Promise(r => {
    resolve = r;
  });

  function unexpectedContentEvent(evt) {
    Assert.ok(false, "Received a " + evt.type + " event on content");
  }

  var gDoc = null;

  addEventListener("load", tabLoad, true);

  function tabLoad() {
    if (content.location.href == "about:blank") {
      return;
    }
    removeEventListener("load", tabLoad, true);

    gDoc = content.document;
    gDoc.addEventListener(
      "DOMPossibleUsernameInputAdded",
      unexpectedContentEvent
    );
    addEventListener("DOMPossibleUsernameInputAdded", unexpectedContentEvent);
    gDoc.defaultView.setTimeout(test_inputAdd, 0);
  }

  function test_inputAdd() {
    if (expected) {
      addEventListener("DOMPossibleUsernameInputAdded", test_inputAddHandler, {
        once: true,
        capture: true,
      });
    } else {
      gDoc.defaultView.setTimeout(test_inputAddHandler, 0);
    }
    let input = gDoc.createElementNS("http://www.w3.org/1999/xhtml", "input");
    input.setAttribute("type", contentIds.INPUT_TYPE);
    input.setAttribute("id", contentIds.INPUT_ID);
    input.setAttribute("data-test", "unique-attribute");
    if (hasForm) {
      gDoc.getElementById(contentIds.FORM1_ID).appendChild(input);
    } else {
      input.setAttribute("autocomplete", "username");
      gDoc.querySelector("body").appendChild(input);
    }
  }

  function test_inputAddHandler(evt) {
    if (expected) {
      evt.stopPropagation();
      if (hasForm) {
        Assert.equal(
          evt.target.id,
          contentIds.FORM1_ID,
          evt.type + " event targets correct username element"
        );
      } else {
        Assert.ok(
          HTMLDocument.isInstance(evt.target),
          evt.type + " event targets document"
        );
      }
    }

    let nextTask;
    if (hasForm) {
      nextTask = test_inputChangeForm;
    } else if (!hasForm && contentIds.INPUT_TYPE !== "text") {
      nextTask = test_inputChangesType;
    } else {
      nextTask = finish;
    }
    gDoc.defaultView.setTimeout(nextTask, 0);
  }

  function test_inputChangeForm() {
    if (expected) {
      addEventListener(
        "DOMPossibleUsernameInputAdded",
        test_inputChangeFormHandler,
        { once: true, capture: true }
      );
    } else {
      gDoc.defaultView.setTimeout(test_inputChangeFormHandler, 0);
    }
    let input = gDoc.getElementById(contentIds.INPUT_ID);
    input.setAttribute("form", contentIds.FORM2_ID);
  }

  function test_inputChangeFormHandler(evt) {
    if (expected) {
      evt.stopPropagation();
      Assert.equal(
        evt.target.id,
        contentIds.FORM2_ID,
        evt.type + " event targets correct username element"
      );
    }
    // TODO(Bug 1864405): Refactor this test to not expect a DOM event
    // when the type is set to the same value
    const nextTask =
      expected && contentIds.INPUT_TYPE === "text"
        ? finish
        : test_inputChangesType;
    gDoc.defaultView.setTimeout(nextTask, 0);
  }

  function test_inputChangesType() {
    if (expected) {
      addEventListener(
        "DOMPossibleUsernameInputAdded",
        test_inputChangesTypeHandler,
        { once: true, capture: true }
      );
    } else {
      gDoc.defaultView.setTimeout(test_inputChangesTypeHandler, 0);
    }
    let input = gDoc.getElementById(contentIds.CHANGE_INPUT_ID);
    input.setAttribute("type", contentIds.INPUT_TYPE);
  }

  function test_inputChangesTypeHandler(evt) {
    if (expected) {
      evt.stopPropagation();
      if (hasForm) {
        Assert.equal(
          evt.target.id,
          contentIds.FORM1_ID,
          evt.type + " event targets correct input element (changed type)"
        );
      } else {
        Assert.ok(
          HTMLDocument.isInstance(evt.target),
          evt.type + " event targets document"
        );
      }
    }
    gDoc.defaultView.setTimeout(finish, 0);
  }

  function finish() {
    removeEventListener(
      "DOMPossibleUsernameInputAdded",
      unexpectedContentEvent
    );
    gDoc.removeEventListener(
      "DOMPossibleUsernameInputAdded",
      unexpectedContentEvent
    );
    resolve();
  }

  return promise;
}

add_setup(async function () {
  Services.prefs.setBoolPref("signon.usernameOnlyForm.enabled", true);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("signon.usernameOnlyForm.enabled");
  });
});

add_task(async function test_disconnectedInputs() {
  const tab = (gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser));
  await ContentTask.spawn(tab.linkedBrowser, [], async () => {
    const unexpectedEvent = evt => {
      Assert.ok(
        false,
        `${evt.type} should not be fired for disconnected forms.`
      );
    };

    addEventListener("DOMPossibleUsernameInputAdded", unexpectedEvent);
    const form = content.document.createElement("form");
    const textInput = content.document.createElement("input");
    textInput.setAttribute("type", "text");
    form.appendChild(textInput);

    // Delay the execution for a bit to allow time for any asynchronously
    // dispatched 'DOMPossibleUsernameInputAdded' events to be processed.
    // This is necessary because such events might not be triggered immediately,
    // and we want to ensure that if they are dispatched, they are captured
    // before we remove the event listener.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 50));
    removeEventListener("DOMPossibleUsernameInputAdded", unexpectedEvent);
  });

  Assert.ok(true, "Test completed");
  gBrowser.removeCurrentTab();
});

add_task(async function test_usernameOnlyForm() {
  for (let type of ["text", "email"]) {
    let tab = (gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser));

    ids.INPUT_TYPE = type;
    let promise = ContentTask.spawn(
      tab.linkedBrowser,
      { contentIds: ids, expected: true },
      task
    );
    BrowserTestUtils.startLoadingURIString(
      tab.linkedBrowser,
      `data:text/html;charset=utf-8,
        <html><body>
        <form id="${ids.FORM1_ID}">
          <input id="${ids.CHANGE_INPUT_ID}">
        </form>
        <form id="${ids.FORM2_ID}"></form>
        </body></html>`
    );
    await promise;

    Assert.ok(true, "Test completed");
    gBrowser.removeCurrentTab();
  }
});

add_task(async function test_formlessUsernameInput() {
  for (let type of ["text", "email"]) {
    let tab = (gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser));

    ids.INPUT_TYPE = type;
    let promise = ContentTask.spawn(
      tab.linkedBrowser,
      { contentIds: ids, expected: true, hasForm: false },
      task
    );
    BrowserTestUtils.startLoadingURIString(
      tab.linkedBrowser,
      `data:text/html;charset=utf-8,
        <html><body>
          <input id="${ids.CHANGE_INPUT_ID}" autocomplete="username">
        </body></html>`
    );
    await promise;

    Assert.ok(true, "Test completed");
    gBrowser.removeCurrentTab();
  }
});

add_task(async function test_nonSupportedInputType() {
  for (let type of ["url", "tel", "number"]) {
    let tab = (gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser));

    ids.INPUT_TYPE = type;
    let promise = ContentTask.spawn(
      tab.linkedBrowser,
      { contentIds: ids, expected: false },
      task
    );
    BrowserTestUtils.startLoadingURIString(
      tab.linkedBrowser,
      `data:text/html;charset=utf-8,
        <html><body>
        <form id="${ids.FORM1_ID}">
          <input id="${ids.CHANGE_INPUT_ID}">
        </form>
        <form id="${ids.FORM2_ID}"></form>
        </body></html>`
    );
    await promise;

    Assert.ok(true, "Test completed");
    gBrowser.removeCurrentTab();
  }
});

add_task(async function test_usernameOnlyFormPrefOff() {
  Services.prefs.setBoolPref("signon.usernameOnlyForm.enabled", false);

  for (let type of ["text", "email"]) {
    let tab = (gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser));

    ids.INPUT_TYPE = type;
    let promise = ContentTask.spawn(
      tab.linkedBrowser,
      { contentIds: ids, expected: false },
      task
    );
    BrowserTestUtils.startLoadingURIString(
      tab.linkedBrowser,
      `data:text/html;charset=utf-8,
        <html><body>
        <form id="${ids.FORM1_ID}">
          <input id="${ids.CHANGE_INPUT_ID}">
        </form>
        <form id="${ids.FORM2_ID}"></form>
        </body></html>`
    );
    await promise;

    Assert.ok(true, "Test completed");
    gBrowser.removeCurrentTab();
  }

  Services.prefs.clearUserPref("signon.usernameOnlyForm.enabled");
});
