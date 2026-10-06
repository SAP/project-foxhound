/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
// These correspond to the constants in <ApplicationServices/UniversalAccess.h>
const kUAZoomFocusTypeOther = 0;
const kUAZoomFocusTypeInsertionPoint = 1;

// Verify MozUAZoomChangeFocus is fired with type "other" when focus changes.
addAccessibleTask(`<button id="button">hello</button>`, async browser => {
  const evt = waitForMacEventWithInfo(
    "MozUAZoomChangeFocus",
    iface => iface.getAttributeValue("AXDOMIdentifier") == "button"
  );

  await SpecialPowers.spawn(browser, [], () => {
    content.document.getElementById("button").focus();
  });

  const { macIface, data } = await evt;
  // verify the event is fired on the acc we expect
  is(
    macIface.getAttributeValue("AXDOMIdentifier"),
    "button",
    "UAZoomChangeFocus fired on button"
  );
  // ... with the type we expect
  is(
    data.AXFocusType,
    kUAZoomFocusTypeOther,
    "UAZoomChangeFocus fired with kUAZoomFocusTypeOther on focus change"
  );
  // ... and no caret rect
  is(
    data.AXHighlightRect,
    undefined,
    "UAZoomChangeFocus has no caret rect on focus change"
  );
});

// Verify MozUAZoomChangeFocus is fired with type "insertion point" when
// the text caret is moved.
addAccessibleTask(`<input id="input" value="hello world" />`, async browser => {
  await SpecialPowers.spawn(browser, [], () => {
    // first, focus the input
    content.document.getElementById("input").focus();
  });

  const evt = waitForMacEventWithInfo(
    "MozUAZoomChangeFocus",
    iface => iface.getAttributeValue("AXDOMIdentifier") == "input"
  );

  await SpecialPowers.spawn(browser, [], () => {
    // then, move the text caret
    content.document.getElementById("input").setSelectionRange(5, 5);
  });

  const { macIface, data } = await evt;
  // verify the event is fired on the acc we expect
  is(
    macIface.getAttributeValue("AXDOMIdentifier"),
    "input",
    "UAZoomChangeFocus fired on input"
  );
  // ... with the type we expect
  is(
    data.AXFocusType,
    kUAZoomFocusTypeInsertionPoint,
    "UAZoomChangeFocus fired with kUAZoomFocusTypeInsertionPoint on caret move"
  );
  // ... and a non-empty caret rect
  Assert.greater(
    data.AXHighlightRect.size[0],
    0,
    "UAZoomChangeFocus has non-zero caret rect width on caret move"
  );
  Assert.greater(
    data.AXHighlightRect.size[1],
    0,
    "UAZoomChangeFocus has non-zero caret rect height on caret move"
  );
});

// Verify MozUAZoomChangeFocus is fired with type "insertion point" and a caret
// rect when focus moves to an editable root.
addAccessibleTask(
  `<div id="editable" contenteditable="true">hello world</div>`,
  async browser => {
    const evt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      iface => iface.getAttributeValue("AXDOMIdentifier") == "editable"
    );

    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("editable").focus();
    });

    const { macIface, data } = await evt;
    is(
      macIface.getAttributeValue("AXDOMIdentifier"),
      "editable",
      "UAZoomChangeFocus fired on contenteditable"
    );
    is(
      data.AXFocusType,
      kUAZoomFocusTypeInsertionPoint,
      "UAZoomChangeFocus fired with kUAZoomFocusTypeInsertionPoint when editable root is focused"
    );
    Assert.greater(
      data.AXHighlightRect.size[0],
      0,
      "UAZoomChangeFocus has non-zero caret rect width"
    );
    Assert.greater(
      data.AXHighlightRect.size[1],
      0,
      "UAZoomChangeFocus has non-zero caret rect height"
    );
  }
);

// Verify moving the focused acc causes MozUAZoomChangeFocus events to fire, even when
// no focus events or caret move events are fired.
// Also: verify UAZoom events are not fired for every viewport change, only
// those which alter the computed bounds of the focused acc.
addAccessibleTask(
  `<button id="other" style="position: absolute; top: 200px;">other</button>
   <button id="button">hello</button>`,
  async browser => {
    const initialEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      iface => iface.getAttributeValue("AXDOMIdentifier") == "button"
    );
    // Focus the button
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("button").focus();
    });
    const { data: initialData } = await initialEvt;
    // Capture the initial y-coord so we can verify the bounds change
    const initialButtonY = initialData.AXRect.origin[1];

    // Count UAZoom events fired. We use this to verify
    // no spurious event fires during the negative-test step.
    let uaZoomCount = 0;
    const countObserver = {
      observe(_, _topic, data) {
        if (data === "MozUAZoomChangeFocus") {
          uaZoomCount++;
        }
      },
    };
    Services.obs.addObserver(countObserver, "accessible-mac-event");

    // Move a different element. This triggers a viewport cache update, but the
    // focused button's bounds are unchanged, so no UAZoom event should fire.
    // Because this element is position:absolute, its position should not
    // affect the button's position.
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("other").style.top = "400px";
    });

    // Check for the event we care about: one that modifies the y-coord
    // of the button.
    let evt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      (iface, data) =>
        iface.getAttributeValue("AXDOMIdentifier") == "button" &&
        data.AXRect.origin[1] !== initialButtonY
    );

    // Move the button without re-focusing it, this will trigger a viewport
    // cache update _and_ modify the acc's bounds.
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("button").style.marginTop = "200px";
    });

    let { macIface, data } = await evt;
    Services.obs.removeObserver(countObserver, "accessible-mac-event");

    is(
      uaZoomCount,
      1,
      "UAZoom event only fired for the button's location change, not for unrelated layout change"
    );
    is(
      macIface.getAttributeValue("AXDOMIdentifier"),
      "button",
      "UAZoomChangeFocus fired on button"
    );
    is(
      data.AXFocusType,
      kUAZoomFocusTypeOther,
      "UAZoomChangeFocus fired with kUAZoomFocusTypeOther"
    );
  }
);

// Verify MozUAZoomChangeFocus events are not suppressed when focus moves to
// a different element that happens to share the same bounds as the
// previously-focused element.
addAccessibleTask(
  `<button id="a" style="position:absolute;top:0;left:0;width:100px;height:30px">a</button>
   <button id="b" style="position:absolute;top:0;left:0;width:100px;height:30px">b</button>`,
  async browser => {
    // Focus the first button and wait for its UAZoom event.
    const firstEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      iface => iface.getAttributeValue("AXDOMIdentifier") == "a"
    );
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("a").focus();
    });
    await firstEvt;

    // Now focus the second button, which is at the exact same position.
    const secondEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      iface => iface.getAttributeValue("AXDOMIdentifier") == "b"
    );
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("b").focus();
    });

    const { macIface } = await secondEvt;
    is(
      macIface.getAttributeValue("AXDOMIdentifier"),
      "b",
      "UAZoomChangeFocus fired for second button"
    );
  }
);

// Verify MozUAZoomChangeFocus is fired when the page is scrolled
addAccessibleTask(
  `<button id="button">hello</button>
   <div style="height: 110vh;"></div>`,
  async browser => {
    const initialEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      iface => iface.getAttributeValue("AXDOMIdentifier") == "button"
    );
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("button").focus();
    });
    const { data: initialData } = await initialEvt;
    const initialButtonY = initialData.AXRect.origin[1];

    const scrollEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      (iface, data) =>
        iface.getAttributeValue("AXDOMIdentifier") == "button" &&
        data.AXRect.origin[1] !== initialButtonY
    );

    await SpecialPowers.spawn(browser, [], () => {
      content.window.scrollBy(0, 100);
    });

    const { macIface } = await scrollEvt;
    is(
      macIface.getAttributeValue("AXDOMIdentifier"),
      "button",
      "UAZoomChangeFocus fired after scroll"
    );
  }
);

// Verify MozUAZoomChangeFocus is fired after panning with APZ
addAccessibleTask(
  `<button id="button">hello</button>
   <div style="height: 1000px;"></div>`,
  async browser => {
    const initialEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      iface => iface.getAttributeValue("AXDOMIdentifier") == "button"
    );
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("button").focus();
    });
    const { data: initialData } = await initialEvt;
    const initialButtonY = initialData.AXRect.origin[1];

    const apzEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      (iface, data) =>
        iface.getAttributeValue("AXDOMIdentifier") == "button" &&
        data.AXRect.origin[1] !== initialButtonY
    );

    await SpecialPowers.spawn(browser, [], async () => {
      const scrollPromise = new Promise(resolve => {
        content.window.visualViewport.addEventListener("scroll", resolve, {
          once: true,
        });
      });
      const utils = SpecialPowers.getDOMWindowUtils(content.window);
      utils.setResolutionAndScaleTo(2);
      utils.scrollToVisual(
        0,
        200,
        utils.UPDATE_TYPE_MAIN_THREAD,
        utils.SCROLL_MODE_INSTANT
      );
      await scrollPromise;
    });

    const { macIface } = await apzEvt;
    is(
      macIface.getAttributeValue("AXDOMIdentifier"),
      "button",
      "UAZoomChangeFocus fired after APZ pan"
    );
  }
);

// Verify MozUAZoomChangeFocus is fired when a CSS transform on an ancestor
// moves the focused accessible's screen position.
addAccessibleTask(
  `<div id="container"><button id="button">hello</button></div>`,
  async browser => {
    const initialEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      iface => iface.getAttributeValue("AXDOMIdentifier") == "button"
    );
    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("button").focus();
    });
    const { data: initialData } = await initialEvt;
    const initialButtonY = initialData.AXRect.origin[1];

    const transformEvt = waitForMacEventWithInfo(
      "MozUAZoomChangeFocus",
      (iface, data) =>
        iface.getAttributeValue("AXDOMIdentifier") == "button" &&
        data.AXRect.origin[1] !== initialButtonY
    );

    await SpecialPowers.spawn(browser, [], () => {
      content.document.getElementById("container").style.transform =
        "translateY(200px)";
    });

    const { macIface } = await transformEvt;
    is(
      macIface.getAttributeValue("AXDOMIdentifier"),
      "button",
      "UAZoomChangeFocus fired after CSS transform change"
    );
  }
);
