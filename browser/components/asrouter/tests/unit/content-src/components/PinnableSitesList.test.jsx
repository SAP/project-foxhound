/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { mount } from "enzyme";
import { PinnableSitesList } from "content-src/components/PinnableSitesList";
import { MultiStageUtils } from "content-src/lib/multistage-utils.mjs";
import { GlobalOverrider } from "tests/unit/utils";

const TILE = {
  pinButtonLabel: { raw: "Pin" },
  data: [
    {
      id: "gmail",
      name: "Gmail",
      description: { raw: "mail.google.com" },
      iconUrl: "https://example.com/icon.png",
      url: "https://mail.google.com/",
    },
    {
      id: "youtube",
      name: "YouTube",
      iconUrl: "https://example.com/icon2.png",
      url: "https://www.youtube.com/",
    },
  ],
};

describe("PinnableSitesList component", () => {
  let sandbox;
  let globals;
  let handleAction;
  let sendActionTelemetry;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    globals = new GlobalOverrider();
    globals.set({
      AWSendToParent: sandbox.stub().resolves(true),
      AWSendEventTelemetry: sandbox.stub(),
    });
    handleAction = sandbox.stub().resolves(true);
    sendActionTelemetry = sandbox.stub(MultiStageUtils, "sendActionTelemetry");
  });

  afterEach(() => {
    sandbox.restore();
    globals.restore();
  });

  it("renders null when tile has no data", () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={{}}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    assert.ok(wrapper.isEmptyRender());
  });

  it("renders null when tile is undefined", () => {
    const wrapper = mount(
      <PinnableSitesList messageId="TEST_MSG" handleAction={handleAction} />
    );
    assert.ok(wrapper.isEmptyRender());
  });

  it("renders a list item for each site", () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    assert.equal(wrapper.find(".pinnable-sites-item").length, TILE.data.length);
  });

  it("renders a pin button for each site", () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    assert.equal(
      wrapper.find(".pinnable-sites-pin-button").length,
      TILE.data.length
    );
  });

  it("renders an icon for each site", () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    const icons = wrapper.find(".pinnable-sites-icon");
    assert.equal(icons.length, TILE.data.length);
    assert.equal(icons.at(0).prop("src"), TILE.data[0].iconUrl);
  });

  it("does not render a description span when description is absent", () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    // youtube item has no description
    const items = wrapper.find(".pinnable-sites-item");
    assert.equal(
      items.at(1).find(".pinnable-sites-description").length,
      0,
      "no description element when property is absent"
    );
  });

  it("pin buttons are enabled by default", () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").forEach(btn => {
      assert.equal(btn.prop("disabled"), false);
    });
  });

  it("disables the button and calls handleAction on click", async () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");

    assert.ok(handleAction.calledOnce, "handleAction called once");
    const [, action] = handleAction.firstCall.args;
    assert.deepEqual(
      action,
      {
        type: "PIN_TASKBAR_TAB",
        needsAwait: true,
        data: {
          url: TILE.data[0].url,
          name: TILE.data[0].name,
          iconUrl: TILE.data[0].iconUrl,
        },
      },
      "handleAction called with correct PIN_TASKBAR_TAB action"
    );
  });

  it("leaves button disabled after a successful pin", async () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");
    await handleAction.firstCall.returnValue;
    wrapper.update();

    assert.equal(
      wrapper.find(".pinnable-sites-pin-button").first().prop("disabled"),
      true,
      "button stays disabled after successful pin"
    );
  });

  it("re-enables button when pin fails (result === false)", async () => {
    handleAction.resolves(false);
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");
    await handleAction.firstCall.returnValue;
    wrapper.update();

    assert.equal(
      wrapper.find(".pinnable-sites-pin-button").first().prop("disabled"),
      false,
      "button re-enabled after pin failure"
    );
  });

  it("leaves button disabled when site already existed (result === null)", async () => {
    handleAction.resolves(null);
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");
    await handleAction.firstCall.returnValue;
    wrapper.update();

    assert.equal(
      wrapper.find(".pinnable-sites-pin-button").first().prop("disabled"),
      true,
      "button stays disabled when site was already pinned"
    );
  });

  it("sends PIN_SITE telemetry with result=success after a successful pin", async () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");
    await handleAction.firstCall.returnValue;

    assert.ok(
      sendActionTelemetry.calledWith("TEST_MSG", TILE.data[0].id, "PIN_SITE", {
        result: "success",
      }),
      "PIN_SITE telemetry sent with result=success"
    );
  });

  it("sends PIN_SITE telemetry with result=already_pinned when site existed", async () => {
    handleAction.resolves(null);
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");
    await handleAction.firstCall.returnValue;

    assert.ok(
      sendActionTelemetry.calledWith("TEST_MSG", TILE.data[0].id, "PIN_SITE", {
        result: "already_pinned",
      }),
      "PIN_SITE telemetry sent with result=already_pinned"
    );
  });

  it("sends PIN_SITE telemetry with result=failure when pin fails", async () => {
    handleAction.resolves(false);
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");
    await handleAction.firstCall.returnValue;

    assert.ok(
      sendActionTelemetry.calledWith("TEST_MSG", TILE.data[0].id, "PIN_SITE", {
        result: "failure",
      }),
      "PIN_SITE telemetry sent with result=failure"
    );
  });

  it("only affects the clicked item's button state", async () => {
    const wrapper = mount(
      <PinnableSitesList
        tile={TILE}
        messageId="TEST_MSG"
        handleAction={handleAction}
      />
    );
    wrapper.find(".pinnable-sites-pin-button").first().simulate("click");
    await handleAction.firstCall.returnValue;
    wrapper.update();

    const buttons = wrapper.find(".pinnable-sites-pin-button");
    assert.equal(
      buttons.at(0).prop("disabled"),
      true,
      "clicked button disabled"
    );
    assert.equal(
      buttons.at(1).prop("disabled"),
      false,
      "other button unaffected"
    );
  });
});
