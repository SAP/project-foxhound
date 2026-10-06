/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const setDefaultStub = sinon.stub();
const shellStub = sinon
  .stub(ShellService, "shellService")
  .value({ setDefaultBrowser: setDefaultStub });

add_setup(async () => {
  Services.fog.initializeFOG();
});

add_task(async function test_applicationMenu_setAsDefault() {
  await Services.fog.testResetFOG();

  let menuitem = document.getElementById("menu_setAsDefault");
  ok(!!menuitem, "menu_setAsDefault exists");

  menuitem.doCommand();

  Assert.equal(setDefaultStub.called, true, "setDefault was not called");

  var events = Glean.browserApplicationmenu.setAsDefault.testGetValue();
  Assert.equal(1, events.length);
  Assert.equal("set_as_default", events[0].name);
});
