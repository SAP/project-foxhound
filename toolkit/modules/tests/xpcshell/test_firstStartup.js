"use strict";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
const { FirstStartup } = ChromeUtils.importESModule(
  "resource://gre/modules/FirstStartup.sys.mjs"
);
const { updateAppInfo } = ChromeUtils.importESModule(
  "resource://testing-common/AppInfo.sys.mjs"
);

const PREF_TIMEOUT = "first-startup.timeout";

add_setup(function test_setup() {
  // FOG needs a profile directory to put its data in.
  do_get_profile();

  // FOG needs to be initialized in order for data to flow.
  Services.fog.initializeFOG();
});

add_task(async function test_success() {
  updateAppInfo();

  let submissionPromise;

  if (AppConstants.MOZ_NORMANDY || AppConstants.MOZ_UPDATE_AGENT) {
    submissionPromise = new Promise(resolve => {
      GleanPings.firstStartup.testBeforeNextSubmit(() => {
        Assert.equal(FirstStartup.state, FirstStartup.SUCCESS);
        Assert.equal(
          Glean.firstStartup.statusCode.testGetValue(),
          FirstStartup.SUCCESS
        );
        resolve();
      });
    });
  } else {
    submissionPromise = new Promise(resolve => {
      GleanPings.firstStartup.testBeforeNextSubmit(() => {
        Assert.equal(FirstStartup.state, FirstStartup.UNSUPPORTED);
        Assert.equal(
          Glean.firstStartup.statusCode.testGetValue(),
          FirstStartup.UNSUPPORTED
        );
        resolve();
      });
    });
  }

  FirstStartup.init();
  await submissionPromise;
});

add_task(async function test_timeout() {
  updateAppInfo();
  Services.prefs.setIntPref(PREF_TIMEOUT, 0);

  let submissionPromise;

  if (AppConstants.MOZ_NORMANDY || AppConstants.MOZ_UPDATE_AGENT) {
    submissionPromise = new Promise(resolve => {
      GleanPings.firstStartup.testBeforeNextSubmit(() => {
        Assert.equal(FirstStartup.state, FirstStartup.TIMED_OUT);
        Assert.notEqual(Glean.firstStartup.elapsed.testGetValue(), null);
        resolve();
      });
    });
  } else {
    submissionPromise = new Promise(resolve => {
      GleanPings.firstStartup.testBeforeNextSubmit(() => {
        Assert.equal(FirstStartup.state, FirstStartup.UNSUPPORTED);
        Assert.equal(Glean.firstStartup.elapsed.testGetValue(), null);
        resolve();
      });
    });
  }

  FirstStartup.init();
  await submissionPromise;
});
