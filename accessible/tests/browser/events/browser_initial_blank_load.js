"use strict";

addAccessibleTask(
  "we get a doc load complete event for the initial about:blank",
  async function (browser, docAcc) {
    let loaded = waitForEvent(
      EVENT_DOCUMENT_LOAD_COMPLETE,
      evt => evt.accessible.parent.parent == docAcc
    );
    await invokeContentTask(browser, [], () => {
      content.iframe = content.document.createElement("iframe");
      content.iframe.src = "about:blank";
      content.document.body.append(content.iframe);
    });
    await loaded;
  }
);
