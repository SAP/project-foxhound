/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test for bug 673467.  In a new tab, load a page which inserts a new iframe
// before the load and then sets its location during the load.  This should
// create just one SHEntry.

const HELLO_HTML = "data:text/html,Hello!";

var doc = `data:text/html,<html><body onload='load()'>
  <script>
    var iframe = document.createElement('iframe');
    iframe.id = 'iframe';
    document.documentElement.appendChild(iframe);
    function load() {
      iframe.src = '${HELLO_HTML}';
    }
  </script>
</body></html>`;

function test() {
  waitForExplicitFinish();

  let taskFinished;

  let tab = BrowserTestUtils.addTab(gBrowser, doc, {}, tabEl => {
    let browser = tabEl.linkedBrowser;
    taskFinished = BrowserTestUtils.browserLoaded(
      browser,
      true,
      HELLO_HTML
    ).then(async () => {
      await SpecialPowers.spawn(browser, [], function () {
        let shistory = content.docShell.QueryInterface(
          Ci.nsIWebNavigation
        ).sessionHistory;
        Assert.equal(shistory.count, 1, "shistory count should be 1.");
      });
    });
  });

  taskFinished.then(() => {
    gBrowser.removeTab(tab);
    finish();
  });
}
