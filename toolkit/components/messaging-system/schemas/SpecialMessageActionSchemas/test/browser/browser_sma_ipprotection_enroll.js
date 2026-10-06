/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_IPPROTECTION_ENROLL() {
  const { IPProtection } = ChromeUtils.importESModule(
    "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs"
  );
  const mockPanel = { enroll: sinon.stub().resolves() };
  const getPanelStub = sinon.stub(IPProtection, "getPanel").returns(mockPanel);

  await SMATestUtils.executeAndValidateAction({
    type: "IPPROTECTION_ENROLL",
  });

  Assert.equal(getPanelStub.callCount, 1, "getPanel should be called once");
  Assert.equal(
    mockPanel.enroll.callCount,
    1,
    "enroll should be called once on the panel"
  );

  getPanelStub.restore();
});

add_task(async function test_IPPROTECTION_ENROLL_no_panel() {
  const { IPProtection } = ChromeUtils.importESModule(
    "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs"
  );
  const getPanelStub = sinon.stub(IPProtection, "getPanel").returns(null);

  await SMATestUtils.executeAndValidateAction({
    type: "IPPROTECTION_ENROLL",
  });

  Assert.equal(
    getPanelStub.callCount,
    1,
    "getPanel should be called once even when panel is unavailable"
  );

  getPanelStub.restore();
});
