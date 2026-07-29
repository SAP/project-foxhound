/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React from "react";
import { mount } from "enzyme";
import { WidgetCelebration } from "content-src/components/Widgets/WidgetCelebration";

const DEFAULT_FRAME = { width: 300, height: 200, strokeInset: 1.5, radius: 8 };

const defaultProps = {
  celebrationFrame: DEFAULT_FRAME,
  celebrationId: 1,
  headlineL10nId: "test-headline",
  illustrationSrc: "chrome://newtab/content/data/content/assets/image.svg",
  onComplete: () => {},
  subheadL10nId: "test-subhead",
};

describe("<WidgetCelebration>", () => {
  it("renders", () => {
    const wrapper = mount(<WidgetCelebration {...defaultProps} />);
    assert.ok(wrapper.exists());
  });

  it("uses the default widget-celebration classNamePrefix", () => {
    const wrapper = mount(<WidgetCelebration {...defaultProps} />);
    assert.ok(wrapper.find(".widget-celebration").exists());
    assert.ok(wrapper.find(".widget-celebration-copy").exists());
    assert.ok(wrapper.find(".widget-celebration-effects").exists());
    assert.ok(wrapper.find(".widget-celebration-illustration").exists());
  });

  it("uses a custom classNamePrefix", () => {
    const wrapper = mount(
      <WidgetCelebration
        {...defaultProps}
        classNamePrefix="lists-celebration"
      />
    );
    assert.ok(wrapper.find(".lists-celebration").exists());
    assert.ok(wrapper.find(".lists-celebration-copy").exists());
    assert.isFalse(wrapper.find(".widget-celebration").exists());
  });

  it("appends ?run=celebrationId to SVG illustration src", () => {
    const wrapper = mount(
      <WidgetCelebration {...defaultProps} celebrationId={3} />
    );
    assert.ok(wrapper.find("img").prop("src").endsWith("?run=3"));
  });

  it("does not modify non-SVG illustration src", () => {
    const src = "chrome://newtab/content/data/content/assets/image.png";
    const wrapper = mount(
      <WidgetCelebration {...defaultProps} illustrationSrc={src} />
    );
    assert.equal(wrapper.find("img").prop("src"), src);
  });

  it("renders headline with correct l10n id", () => {
    const wrapper = mount(<WidgetCelebration {...defaultProps} />);
    assert.equal(
      wrapper.find(".widget-celebration-headline").prop("data-l10n-id"),
      "test-headline"
    );
  });

  it("renders subhead with correct l10n id", () => {
    const wrapper = mount(<WidgetCelebration {...defaultProps} />);
    assert.equal(
      wrapper.find(".widget-celebration-subhead").prop("data-l10n-id"),
      "test-subhead"
    );
  });

  it("calls onComplete when animation ends on root with the lifecycle animation name", () => {
    const onComplete = sinon.stub();
    const wrapper = mount(
      <WidgetCelebration {...defaultProps} onComplete={onComplete} />
    );
    const root = wrapper.find(".widget-celebration");
    const node = root.getDOMNode();
    root.prop("onAnimationEnd")({
      target: node,
      currentTarget: node,
      animationName: "widget-celebration-lifecycle",
    });
    assert.ok(onComplete.calledOnce);
  });

  it("does not call onComplete for a different animation name", () => {
    const onComplete = sinon.stub();
    const wrapper = mount(
      <WidgetCelebration {...defaultProps} onComplete={onComplete} />
    );
    const root = wrapper.find(".widget-celebration");
    const node = root.getDOMNode();
    root.prop("onAnimationEnd")({
      target: node,
      currentTarget: node,
      animationName: "other-animation",
    });
    assert.ok(onComplete.notCalled);
  });

  it("does not call onComplete when target is not currentTarget", () => {
    const onComplete = sinon.stub();
    const wrapper = mount(
      <WidgetCelebration {...defaultProps} onComplete={onComplete} />
    );
    const root = wrapper.find(".widget-celebration");
    const node = root.getDOMNode();
    root.prop("onAnimationEnd")({
      target: document.createElement("div"),
      currentTarget: node,
      animationName: "widget-celebration-lifecycle",
    });
    assert.ok(onComplete.notCalled);
  });

  it("does not throw when onComplete is not provided", () => {
    const wrapper = mount(
      <WidgetCelebration {...defaultProps} onComplete={undefined} />
    );
    const root = wrapper.find(".widget-celebration");
    const node = root.getDOMNode();
    assert.doesNotThrow(() => {
      root.prop("onAnimationEnd")({
        target: node,
        currentTarget: node,
        animationName: "widget-celebration-lifecycle",
      });
    });
  });
});
