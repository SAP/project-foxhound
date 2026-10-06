/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useRef } from "react";
import { mount } from "enzyme";
import { useWidgetCelebration } from "content-src/components/Widgets/useWidgetCelebration";

function TestComponent({ onRender }) {
  const widgetRef = useRef(null);
  const celebration = useWidgetCelebration(widgetRef);
  onRender(celebration);
  return <div ref={widgetRef} />;
}

function NullRefComponent({ onRender }) {
  const celebration = useWidgetCelebration({ current: null });
  onRender(celebration);
  return <div />;
}

describe("useWidgetCelebration", () => {
  let sandbox;
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    sandbox = sinon.createSandbox();
    sandbox
      .stub(Element.prototype, "getBoundingClientRect")
      .returns({ width: 300, height: 200 });
  });

  afterEach(() => {
    sandbox.restore();
    window.matchMedia = originalMatchMedia;
  });

  it("returns initial state", () => {
    let state;
    mount(<TestComponent onRender={s => (state = s)} />);
    assert.isFalse(state.isCelebrating);
    assert.isNull(state.celebrationFrame);
    assert.equal(state.celebrationId, 0);
  });

  it("triggerCelebration sets isCelebrating to true", () => {
    let state;
    const wrapper = mount(<TestComponent onRender={s => (state = s)} />);
    state.triggerCelebration();
    wrapper.update();
    assert.isTrue(state.isCelebrating);
  });

  it("triggerCelebration increments celebrationId on each call", () => {
    let state;
    const wrapper = mount(<TestComponent onRender={s => (state = s)} />);
    state.triggerCelebration();
    wrapper.update();
    assert.equal(state.celebrationId, 1);
    state.triggerCelebration();
    wrapper.update();
    assert.equal(state.celebrationId, 2);
  });

  it("triggerCelebration sets celebrationFrame from widget dimensions", () => {
    let state;
    const wrapper = mount(<TestComponent onRender={s => (state = s)} />);
    state.triggerCelebration();
    wrapper.update();
    assert.equal(state.celebrationFrame.width, 300);
    assert.equal(state.celebrationFrame.height, 200);
    assert.equal(state.celebrationFrame.strokeInset, 1.5);
  });

  it("triggerCelebration does nothing when widgetRef.current is null", () => {
    let state;
    const wrapper = mount(<NullRefComponent onRender={s => (state = s)} />);
    state.triggerCelebration();
    wrapper.update();
    assert.isFalse(state.isCelebrating);
  });

  it("triggerCelebration does nothing when prefers-reduced-motion is set", () => {
    let state;
    window.matchMedia = () => ({ matches: true });
    const wrapper = mount(<TestComponent onRender={s => (state = s)} />);
    state.triggerCelebration();
    wrapper.update();
    assert.isFalse(state.isCelebrating);
  });

  it("completeCelebration sets isCelebrating to false", () => {
    let state;
    const wrapper = mount(<TestComponent onRender={s => (state = s)} />);
    state.triggerCelebration();
    wrapper.update();
    assert.isTrue(state.isCelebrating);
    state.completeCelebration();
    wrapper.update();
    assert.isFalse(state.isCelebrating);
  });
});
