/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

add_task(async function test_private_browsing_dns_filtering() {
  function resolveHost(originAttributes) {
    return new Promise(resolve => {
      Services.dns.asyncResolve(
        "example.org",
        Ci.nsIDNSService.RESOLVE_TYPE_DEFAULT,
        0,
        null,
        { onLookupComplete: resolve },
        null,
        originAttributes
      );
    });
  }

  await resolveHost({});
  await resolveHost({ privateBrowsingId: 1 });

  async function getExampleOrgDnsEntries(browser) {
    return SpecialPowers.spawn(browser, [], async function () {
      await ContentTaskUtils.waitForCondition(() => {
        let c = content.document.getElementById("dns_content");
        for (let row of c.querySelectorAll("tr")) {
          if (row.querySelectorAll("td")[0]?.textContent == "example.org") {
            return true;
          }
        }
        return false;
      }, "Waiting for example.org DNS entry");

      let cont = content.document.getElementById("dns_content");
      let hasRegularEntry = false;
      let hasPBEntry = false;
      for (let row of cont.querySelectorAll("tr")) {
        let cells = row.querySelectorAll("td");
        if (cells[0]?.textContent != "example.org") {
          continue;
        }
        if (cells[5]?.textContent.includes("privateBrowsingId")) {
          hasPBEntry = true;
        } else {
          hasRegularEntry = true;
        }
      }
      return { hasRegularEntry, hasPBEntry };
    });
  }

  await BrowserTestUtils.withNewTab(
    "about:networking#dns",
    async function (browser) {
      ok(!browser.isRemoteBrowser, "Browser should not be remote.");
      let { hasRegularEntry, hasPBEntry } =
        await getExampleOrgDnsEntries(browser);
      ok(hasRegularEntry, "Regular window shows regular example.org DNS entry");
      ok(!hasPBEntry, "Regular window does not show PB example.org DNS entry");
    }
  );

  let pbWin = await BrowserTestUtils.openNewBrowserWindow({ private: true });

  await BrowserTestUtils.withNewTab(
    { gBrowser: pbWin.gBrowser, url: "about:networking#dns" },
    async function (browser) {
      ok(!browser.isRemoteBrowser, "Browser should not be remote.");
      let { hasRegularEntry, hasPBEntry } =
        await getExampleOrgDnsEntries(browser);
      ok(hasRegularEntry, "PB window shows regular example.org DNS entry");
      ok(hasPBEntry, "PB window shows PB example.org DNS entry");
    }
  );

  await BrowserTestUtils.closeWindow(pbWin);
});

add_task(async function test_first() {
  registerCleanupFunction(() => {
    // Must clear mode first, otherwise we'll have non-local connections to
    // the cloudflare URL.
    Services.prefs.clearUserPref("network.trr.mode");
    Services.prefs.clearUserPref("network.trr.uri");
  });

  await BrowserTestUtils.withNewTab(
    "about:networking#dns",
    async function (browser) {
      ok(!browser.isRemoteBrowser, "Browser should not be remote.");
      await SpecialPowers.spawn(browser, [], async function () {
        let url_tbody = content.document.getElementById("dns_trr_url");
        info(url_tbody);
        is(
          url_tbody.children[0].children[0].textContent,
          "https://mozilla.cloudflare-dns.com/dns-query"
        );
        is(url_tbody.children[0].children[1].textContent, "0");
      });
    }
  );

  Services.prefs.setCharPref("network.trr.uri", "https://localhost/testytest");
  Services.prefs.setIntPref("network.trr.mode", 2);
  await BrowserTestUtils.withNewTab(
    "about:networking#dns",
    async function (browser) {
      ok(!browser.isRemoteBrowser, "Browser should not be remote.");
      await SpecialPowers.spawn(browser, [], async function () {
        let url_tbody = content.document.getElementById("dns_trr_url");
        info(url_tbody);
        is(
          url_tbody.children[0].children[0].textContent,
          "https://localhost/testytest"
        );
        is(url_tbody.children[0].children[1].textContent, "2");
      });
    }
  );
});
