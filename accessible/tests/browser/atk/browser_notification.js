/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// From atk/atkobject.h
const ATK_LIVE_POLITE = 1;
const ATK_LIVE_ASSERTIVE = 2;

addAccessibleTask(`<p id="p">p</p>`, async function testAriaNotify(browser) {
  info("p.ariaNotify a normal");
  await runPython(`
    global onEvent
    onEvent = WaitForEvent("object:announcement", "p")
  `);
  await invokeContentTask(browser, [], () => {
    content.p = content.document.getElementById("p");
    content.p.ariaNotify("a");
  });
  let [text, politeness] = await runPython(`
    event = onEvent.wait()
    return event.any_data, event.detail1
  `);
  ok(true, "Got notification event");
  is(text, "a", "text correct");
  is(politeness, ATK_LIVE_POLITE, "politeness correct");

  info("p.ariaNotify b high");
  await runPython(`
    global onEvent
    onEvent = WaitForEvent("object:announcement", "p")
  `);
  await invokeContentTask(browser, [], () => {
    content.p.ariaNotify("b", { priority: "high" });
  });
  [text, politeness] = await runPython(`
    event = onEvent.wait()
    return event.any_data, event.detail1
  `);
  ok(true, "Got notification event");
  is(text, "b", "text correct");
  is(politeness, ATK_LIVE_ASSERTIVE, "politeness correct");

  info("doc.ariaNotify c");
  await runPython(`
    global onEvent
    onEvent = WaitForEvent("object:announcement", "${DEFAULT_CONTENT_DOC_BODY_ID}")
  `);
  await invokeContentTask(browser, [], () => {
    content.document.ariaNotify("c");
  });
  text = await runPython(`
    event = onEvent.wait()
    return event.any_data
  `);
  ok(true, "Got notification event");
  is(text, "c", "text correct");
});
