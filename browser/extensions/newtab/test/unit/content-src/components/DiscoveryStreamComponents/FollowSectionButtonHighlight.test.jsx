import { FollowSectionButtonHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/FollowSectionButtonHighlight";
import { mount } from "enzyme";
import React from "react";

describe("Discovery Stream <FollowSectionButtonHighlight>", () => {
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
      <FollowSectionButtonHighlight
        arrowPosition="arrow-inline-start"
        dispatch={dispatch}
        feature="FEATURE_FOLLOW_SECTION_BUTTON"
        handleBlock={handleBlock}
        handleDismiss={handleDismiss}
        isIntersecting={false}
        messageData={messageData}
        position="inset-inline-end"
        verticalPosition="inset-block-center"
      />
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render highlight container", () => {
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".follow-section-button-highlight").exists());
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
