/* Any copyright is dedicated to the Public Domain.
  http://creativecommons.org/publicdomain/zero/1.0/ */

/* eslint-disable mozilla/no-arbitrary-setTimeout */

// Context menu links prepend `http`, so this is what
// is being tested for rather than an `https` prefix.
/* eslint-disable @microsoft/sdl/no-insecure-url */

function testExpected(expected, msg) {
  is(
    !document.getElementById("context-openlinkincurrent").hidden,
    expected,
    msg
  );
}

function testLinkExpected(expected, msg) {
  is(gContextMenu.linkURL, expected, msg);
}

add_task(async function () {
  const TEST_HTML_STRING = `
<div id="test-root">
  <div id="block1">
    <span id="prefix">http://www.</span><span id="hostTwice">example.com example.com</span>
    <span id="suffix"> - Test</span>
    <span id="anchor"><a href="http://www.example.com">http://www.example.com/example</a></span>
    <p id="nonLinks">mailto:test.com ftp.example.com</p>
    <p id="trailing">example.com   -</p>
  </div>
  <div id="block2">
    <p id="mainDomain">main.example.com</p>
  </div>
  <div id="block3">
    <p id="ipURL">http://192.168.0.1/</p>
    <p id="ipWithPath">http://192.168.0.1/hello</p>
    <p id="hostWithSlash">example.com/</p>
    <p id="hostWithPath">example.com/hello</p>
    <p id="looksLikeURL">http://cheese/hello</p>
    <p id="usernamePasswordURL">hello:password@google.com</p>
    <p id="numberInHost">exam4ple.com</p>
    <p id="hostWithPort">example.com:8080</p>
  </div>
  <div id="block4">
    <p id="email">hello@google.com</p>
    <p id="justCheese">cheese</p>
    <p id="colonSeparated">hello:this</p>
    <p id="atSymbolSeparated">hello@this</p>
    <p id="noHostWithNumber">hello/1</p>
    <p id="noHostWithText">hello/cheese</p>
    <p id="noHostWithModulo">hello/%</p>
    <p id="noHostWithQuestion">hello/?</p>
    <p id="noHostWithPound">hello/#</p>
    <p id="noHostWithSlashOnly">hello/</p>
    <p id="topDomainIllegalNumberEnd">example.com4</p>
    <p id="topDomainIllegalNumberStart">example.4com</p>
    <p id="topDomainIllegalNumberMid">example.co4m</p>
    <p id="illegalNumberBeforePort">example.com4:8080</p>
  </div>
</div>
`;

  const TESTS = [
    // ---- URL selections that should show context menu link options ----
    {
      id: "http-url-across-spans",
      selection: {
        startNode: "prefix",
        startIndex: 0,
        endNode: "hostTwice",
        endIndex: "example.com".length,
      },
      expectLinks: true,
      expectedLink: "http://www.example.com/",
      message: "Link options should show for http://www.example.com",
    },
    {
      id: "url-across-spans-without-http",
      selection: {
        startNode: "prefix",
        startIndex: "http://".length,
        endNode: "hostTwice",
        endIndex: "example.com".length,
      },
      expectLinks: true,
      expectedLink: "http://www.example.com/",
      message: "Link options should show for www.example.com",
    },
    {
      id: "example-com-without-www",
      selection: {
        startNode: "hostTwice",
        startIndex: "example.com ".length,
        endNode: "hostTwice",
        endIndex: "example.com example.com".length,
      },
      expectLinks: true,
      expectedLink: "http://example.com/",
      message:
        "Link options should show for 'example.com' (without prepending 'www').",
    },
    {
      id: "ftp-example",
      selection: {
        startNode: "nonLinks",
        startIndex: "mailto:test.com ".length,
        endNode: "nonLinks",
        endIndex: "mailto:test.com ftp.example.com".length,
      },
      expectLinks: true,
      expectedLink: "http://ftp.example.com/",
      message: "ftp.example.com should be linkified with http://",
    },
    {
      id: "example-trailing-dash",
      selection: {
        startNode: "trailing",
        startIndex: 0,
        endNode: "trailing",
        endIndex: "example.com".length,
      },
      expectLinks: true,
      expectedLink: "http://example.com/",
      message: "Link options should show for \"'example.com'   -\"",
    },
    {
      id: "triple-click-main-domain",
      selection: {
        startNode: "mainDomain",
        startIndex: 0,
        endNode: "mainDomain",
        endIndex: "main.example.com".length,
      },
      expectLinks: true,
      expectedLink: "http://main.example.com/",
      message:
        "Link options should show for triple-click selection of main.example.com",
    },
    {
      id: "anchor-element",
      selection: {
        startNode: "anchor",
        startIndex: 0,
        endNode: "anchor",
        endIndex: "http://www.example.com/example".length,
      },
      expectLinks: false, // Is URL due to anchor element, not plaintext.
      expectedLink: "http://www.example.com/",
      message: "Context menu should use anchor href, not raw text",
    },
    {
      id: "open-suse",
      customHTML: "<div id='os'>open-suse.ru</div>",
      selection: {
        startNode: "os",
        startIndex: 0,
        endNode: "os",
        endIndex: "open-suse.ru".length,
      },
      expectLinks: true,
      expectedLink: "http://open-suse.ru/",
      message: "Link options should show for open-suse.ru",
    },
    {
      id: "ip-address-only",
      selection: {
        startNode: "ipURL",
        startIndex: "http://".length,
        endNode: "ipURL",
        endIndex: "http://192.168.0.1".length,
      },
      expectLinks: true,
      expectedLink: "http://192.168.0.1/",
      message: "Link options should show for ip 192.168.0.1",
    },
    {
      id: "ip-with-protocol",
      selection: {
        startNode: "ipURL",
        startIndex: 0,
        endNode: "ipURL",
        endIndex: "http://192.168.0.1".length,
      },
      expectLinks: true,
      expectedLink: "http://192.168.0.1/",
      message: "Link options should show for ip http://192.168.0.1",
    },
    {
      id: "ip-with-protocol-and-slash",
      selection: {
        startNode: "ipURL",
        startIndex: 0,
        endNode: "ipURL",
        endIndex: "http://192.168.0.1/".length,
      },
      expectLinks: true,
      expectedLink: "http://192.168.0.1/",
      message: "Link options should show for ip http://192.168.0.1/",
    },
    {
      id: "ip-with-path",
      selection: {
        startNode: "ipWithPath",
        startIndex: "http://".length,
        endNode: "ipWithPath",
        endIndex: "http://192.168.0.1/hello".length,
      },
      expectLinks: true,
      expectedLink: "http://192.168.0.1/hello",
      message: "Link options should show for ip 192.168.0.1/hello",
    },
    {
      id: "ip-with-protocol-and-path",
      selection: {
        startNode: "ipWithPath",
        startIndex: 0,
        endNode: "ipWithPath",
        endIndex: "http://192.168.0.1/hello".length,
      },
      expectLinks: true,
      expectedLink: "http://192.168.0.1/hello",
      message: "Link options should show for ip http://192.168.0.1/hello",
    },
    {
      id: "host-with-slash-only",
      selection: {
        startNode: "hostWithSlash",
        startIndex: 0,
        endNode: "hostWithSlash",
        endIndex: "example.com/".length,
      },
      expectLinks: true,
      expectedLink: "http://example.com/",
      message: "Link options should show for example.com/",
    },
    {
      id: "host-with-path",
      selection: {
        startNode: "hostWithPath",
        startIndex: 0,
        endNode: "hostWithPath",
        endIndex: "example.com/hello".length,
      },
      expectLinks: true,
      expectedLink: "http://example.com/hello",
      message: "Link options should show for example.com/hello",
    },
    {
      id: "looks-like-URL",
      selection: {
        startNode: "looksLikeURL",
        startIndex: 0,
        endNode: "looksLikeURL",
        endIndex: "http://cheese/hello".length,
      },
      expectLinks: true,
      expectedLink: "http://cheese/hello",
      message:
        "Link options should show for malformed but plausible url http://cheese/hello",
    },
    {
      id: "username-password-URL",
      selection: {
        startNode: "usernamePasswordURL",
        startIndex: 0,
        endNode: "usernamePasswordURL",
        endIndex: "hello:password@google.com".length,
      },
      expectLinks: true,
      expectedLink: "http://hello:password@google.com/",
      message: "Link options should show for hello:password@google.com",
    },
    {
      id: "host-with-number-in-name",
      selection: {
        startNode: "numberInHost",
        startIndex: 0,
        endNode: "numberInHost",
        endIndex: "exam4ple.com".length,
      },
      expectLinks: true,
      expectedLink: "http://exam4ple.com/",
      message: "Link options should show for exam4ple.com",
    },
    {
      id: "host-with-port",
      selection: {
        startNode: "hostWithPort",
        startIndex: 0,
        endNode: "hostWithPort",
        endIndex: "example.com:8080".length,
      },
      expectLinks: true,
      expectedLink: "http://example.com:8080/",
      message: "Link options should show for example.com:8080",
    },

    // ---- Non-URL selections ----
    {
      id: "selection-not-at-word-boundary",
      selection: {
        startNode: "hostTwice",
        startIndex: 1,
        endNode: "hostTwice",
        endIndex: "www.example.com".length,
      },
      expectLinks: false,
      message: "Link options should not show for \"w'ww.example.com'\"",
    },
    {
      id: "selection-includes-non-url-text",
      selection: {
        startNode: "hostTwice",
        startIndex: "example.com ".length,
        endNode: "suffix",
        endIndex: " - Test".length,
      },
      expectLinks: false,
      message:
        "Link options should not show when crossing non-URL text ('example.com - Test')",
    },
    {
      id: "whitespace-in-selection",
      selection: {
        startNode: "hostTwice",
        startIndex: 12,
        endNode: "hostTwice",
        endIndex: 19,
      },
      expectLinks: false,
      message:
        "Link options should not show for selection with whitespace (' example.com')",
    },
    {
      id: "mailto-link",
      selection: {
        startNode: "nonLinks",
        startIndex: 0,
        endNode: "nonLinks",
        endIndex: "mailto:test.com".length,
      },
      expectLinks: false,
      message: "Link options should not show for mailto: links",
    },
    {
      id: "selection-includes-parentheses",
      customHTML: "<div id='osparens'>(open-suse.ru)</div>",
      selection: {
        startNode: "osparens",
        startIndex: 1,
        endNode: "osparens",
        endIndex: "(open-suse.ru)".length,
      },
      expectLinks: false,
      message: "Link options should not show for 'open-suse.ru)'",
    },
    {
      id: "email", // Emails are intentionally handled differently from URLs.
      selection: {
        startNode: "email",
        startIndex: 0,
        endNode: "email",
        endIndex: "hello@google.com".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello@google.com",
    },
    {
      id: "just-a-word",
      selection: {
        startNode: "justCheese",
        startIndex: 0,
        endNode: "justCheese",
        endIndex: "cheese".length,
      },
      expectLinks: false,
      message: "Link options should not show for cheese",
    },
    {
      id: "colon-separated-words",
      selection: {
        startNode: "colonSeparated",
        startIndex: 0,
        endNode: "colonSeparated",
        endIndex: "hello:this".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello:this",
    },
    {
      id: "at-symbol-separated-words",
      selection: {
        startNode: "atSymbolSeparated",
        startIndex: 0,
        endNode: "atSymbolSeparated",
        endIndex: "hello@this".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello@this",
    },
    {
      id: "host-with-number-after-slash",
      selection: {
        startNode: "noHostWithNumber",
        startIndex: 0,
        endNode: "noHostWithNumber",
        endIndex: "hello/1".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello/1",
    },
    {
      id: "host-with-word-after-slash",
      selection: {
        startNode: "noHostWithText",
        startIndex: 0,
        endNode: "noHostWithText",
        endIndex: "hello/cheese".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello/cheese",
    },
    {
      id: "host-with-modulo-symbol-after-slash",
      selection: {
        startNode: "noHostWithModulo",
        startIndex: 0,
        endNode: "noHostWithModulo",
        endIndex: "hello/%".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello/%",
    },
    {
      id: "host-with-question-mark-after-slash",
      selection: {
        startNode: "noHostWithQuestion",
        startIndex: 0,
        endNode: "noHostWithQuestion",
        endIndex: "hello/?".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello/?",
    },
    {
      id: "host-with-pound-sign-after-slash",
      selection: {
        startNode: "noHostWithPound",
        startIndex: 0,
        endNode: "noHostWithPound",
        endIndex: "hello/#".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello/#",
    },
    {
      id: "host-with-nothing-after-slash",
      selection: {
        startNode: "noHostWithSlashOnly",
        startIndex: 0,
        endNode: "noHostWithSlashOnly",
        endIndex: "hello/".length,
      },
      expectLinks: false,
      message: "Link options should not show for hello/",
    },
    {
      id: "top-level-domain-with-illegal-number-at-end",
      selection: {
        startNode: "topDomainIllegalNumberEnd",
        startIndex: 1,
        endNode: "topDomainIllegalNumberEnd",
        endIndex: "example.com4".length,
      },
      expectLinks: false,
      message: "Link options should not show for example.com4",
    },
    {
      id: "top-level-domain-with-illegal-number-at-start",
      selection: {
        startNode: "topDomainIllegalNumberStart",
        startIndex: 1,
        endNode: "topDomainIllegalNumberStart",
        endIndex: "example.4com".length,
      },
      expectLinks: false,
      message: "Link options should not show for example.4com",
    },
    {
      id: "top-level-domain-with-illegal-number-in-middle",
      selection: {
        startNode: "topDomainIllegalNumberMid",
        startIndex: 1,
        endNode: "topDomainIllegalNumberMid",
        endIndex: "example.co4m".length,
      },
      expectLinks: false,
      message: "Link options should not show for example.co4m",
    },
    {
      id: "top-level-domain-with-illegal-number-before-port",
      selection: {
        startNode: "illegalNumberBeforePort",
        startIndex: 1,
        endNode: "illegalNumberBeforePort",
        endIndex: "example.com4:8080".length,
      },
      expectLinks: false,
      message: "Link options should not show for example.com4:8080",
    },
  ];

  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "data:text/html,<html><body></body></html>"
  );

  await SimpleTest.promiseFocus(gBrowser.selectedBrowser);

  for (let test of TESTS) {
    info("Running test: " + test.id);

    let menuPosition = await SpecialPowers.spawn(
      gBrowser.selectedBrowser,
      [TEST_HTML_STRING, test.selection, test.customHTML],
      async function (html, testSelection, customHTML) {
        // Reset HTML to test template or custom HTML for specific tests
        if (customHTML) {
          content.document.body.innerHTML = customHTML;
        } else {
          content.document.body.innerHTML = "";
          let parser = new content.DOMParser();
          let doc = parser.parseFromString(html, "text/html");
          let node = content.document.importNode(doc.body.firstChild, true);
          content.document.body.appendChild(node);
        }

        // Build selection range from start/end nodes/indices
        let selection = content.getSelection();
        selection.removeAllRanges();
        let range = content.document.createRange();

        let startNode = content.document.getElementById(
          testSelection.startNode
        );

        while (startNode.nodeType != startNode.TEXT_NODE) {
          startNode = startNode.firstChild;
        }

        let endNode = content.document.getElementById(testSelection.endNode);

        while (endNode.nodeType != endNode.TEXT_NODE) {
          endNode = endNode.firstChild;
        }

        range.setStart(startNode, testSelection.startIndex);
        range.setEnd(endNode, testSelection.endIndex);
        selection.addRange(range);

        range.startContainer.parentElement.scrollIntoView();

        // Get the range of the selection and determine its coordinates. These
        // coordinates will be returned to the parent process and the context menu
        // will be opened at that location.
        let rangeRect = range.getBoundingClientRect();
        return [rangeRect.x + 3, rangeRect.y + 3];
      }
    );

    let contentAreaContextMenu = document.getElementById(
      "contentAreaContextMenu"
    );

    // Trigger a mouse event until we receive the popupshown event.
    let sawPopup = false;
    let popupShownPromise = BrowserTestUtils.waitForEvent(
      contentAreaContextMenu,
      "popupshown",
      false,
      () => {
        sawPopup = true;
        return true;
      }
    );
    while (!sawPopup) {
      await BrowserTestUtils.synthesizeMouseAtPoint(
        menuPosition[0],
        menuPosition[1],
        { type: "contextmenu", button: 2 },
        gBrowser.selectedBrowser
      );
      if (!sawPopup) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    await popupShownPromise;

    // Run the tests.
    testExpected(test.expectLinks, test.message);
    if (test.expectedLink) {
      testLinkExpected(
        test.expectedLink,
        `Expected link URL for ${test.id} selection: ${test.expectedLink}`
      );
    }

    // On Linux non-e10s it's possible the menu was closed by a focus-out event
    // on the window. Work around this by calling hidePopup only if the menu
    // hasn't been closed yet. See bug 1352709 comment 36.
    if (contentAreaContextMenu.state === "closed") {
      continue;
    }

    let popupHiddenPromise = BrowserTestUtils.waitForEvent(
      contentAreaContextMenu,
      "popuphidden"
    );
    contentAreaContextMenu.hidePopup();
    await popupHiddenPromise;
  }

  gBrowser.removeCurrentTab();
});
