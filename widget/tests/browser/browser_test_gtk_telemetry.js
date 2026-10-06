/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(function check_desktop_environment_telemetry() {
  if (AppConstants.platform === "linux") {
    Assert.equal(
      Glean.widget.desktopEnvironment.testGetValue(),
      Services.appinfo.desktopEnvironment,
      "Telemetry contains the current desktop environment"
    );
  } else {
    Assert.equal(
      Glean.widget.desktopEnvironment.testGetValue(),
      null,
      "widget.desktopEnvironment is not set on non-Linux"
    );
  }
});
