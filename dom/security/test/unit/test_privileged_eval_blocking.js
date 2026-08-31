/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Workaround for bug 1973683
add_setup(() => {
  Services.prefs.setBoolPref("extensions.webextensions.remote", true);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("extensions.webextensions.remote");
  });
});

add_task(async function () {
  let errorObserved = new Promise(resolve => {
    const listener = {
      observe({ message }) {
        if (message.includes("eval() and eval-like")) {
          Services.console.unregisterListener(listener);
          resolve();
        }
      },
    };
    Services.console.registerListener(listener);
  });

  if (mozinfo.os == "android" && !mozinfo.nightly_build) {
    Assert.equal(
      // eslint-disable-next-line no-eval
      eval("42"),
      42,
      "eval on Android is not disabled yet outside of Nightly"
    );
  } else {
    Assert.throws(
      // eslint-disable-next-line no-eval
      () => eval("42"),
      EvalError,
      "eval() in privileged context should throw"
    );
  }

  await errorObserved;
});
