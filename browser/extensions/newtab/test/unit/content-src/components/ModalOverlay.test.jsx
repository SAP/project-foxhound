import { ModalOverlayWrapper } from "content-src/components/ModalOverlay/ModalOverlay";
import { mount } from "enzyme";
import React from "react";

describe("ModalOverlayWrapper", () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("should render a dialog element", async () => {
    const wrapper = mount(<ModalOverlayWrapper />);
    assert.equal(wrapper.find("dialog").length, 1);
  });

  it("should call props.onClose on an Escape key via cancel event", async () => {
    const onClose = sandbox.stub();
    const wrapper = mount(<ModalOverlayWrapper onClose={onClose} />);

    // Simulate cancel event (fired when Escape is pressed on dialog)
    const dialog = wrapper.find("dialog").getDOMNode();
    const cancelEvent = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    assert.calledOnce(onClose);
  });
});
