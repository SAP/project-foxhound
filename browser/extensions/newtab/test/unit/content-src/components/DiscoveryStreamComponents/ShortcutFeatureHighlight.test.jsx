import React from "react";
import { mount } from "enzyme";
import { ShortcutFeatureHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/ShortcutFeatureHighlight";

describe("Discovery Stream <ShortcutFeatureHighlight>", () => {
  let wrapper;
  let sandbox;
  let dispatch;
  let handleDismiss;
  let handleBlock;
  let messageData;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    handleDismiss = sandbox.stub();
    handleBlock = sandbox.stub();
    messageData = sandbox.stub();

    wrapper = mount(
      <ShortcutFeatureHighlight
        dispatch={dispatch}
        feature="FEATURE_SHORTCUT_HIGHLIGHT"
        handleBlock={handleBlock}
        handleDismiss={handleDismiss}
        messageData={messageData}
        position="inset-block-end inset-inline-start"
      />
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render highlight container", () => {
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".shortcut-feature-highlight").exists());
  });

  it("should dispatch dismiss event and call handleDismiss and handleBlock", () => {
    const dismissCallback = wrapper
      .find("FeatureHighlight")
      .prop("dismissCallback");

    dismissCallback();

    assert(handleDismiss.calledOnce);
    assert(handleBlock.calledOnce);
  });
});
