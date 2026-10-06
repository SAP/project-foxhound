/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React from "react";
import { mount } from "enzyme";
import { actionTypes as at } from "common/Actions.mjs";
import { useWidgetTelemetry } from "content-src/components/Widgets/useWidgetTelemetry";

const WEATHER_WIDGET = { id: "weather", telemetryName: "weather" };
const FOCUS_TIMER_WIDGET = { id: "focusTimer", telemetryName: "focus_timer" };
const LISTS_WIDGET = { id: "lists", telemetryName: "lists" };

function TestComponent({
  dispatch,
  widget,
  widgetSize,
  legacyImpressionTypes,
  legacyUserEventType,
  showEl = true,
  onRender,
}) {
  const telemetry = useWidgetTelemetry({
    dispatch,
    widget,
    widgetSize,
    legacyImpressionTypes,
    legacyUserEventType,
  });
  onRender(telemetry);
  return showEl ? <div ref={telemetry.impressionRef} /> : null;
}

describe("useWidgetTelemetry", () => {
  let sandbox;
  let dispatch;
  let observerStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.spy();
    observerStub = sandbox
      .stub(window, "IntersectionObserver")
      .callsFake(function (cb) {
        this.observe = sandbox.spy();
        this.unobserve = sandbox.spy();
        this.disconnect = sandbox.spy();
        this.callback = cb;
      });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("impression observer", () => {
    it("dispatches WIDGETS_IMPRESSION once when element intersects", () => {
      const wrapper = mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={() => {}}
        />
      );
      const observerInstance = observerStub.getCall(0).returnValue;
      const el = wrapper.find("div").getDOMNode();

      observerInstance.callback([{ isIntersecting: true, target: el }]);

      assert.calledOnce(dispatch);
      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.WIDGETS_IMPRESSION);
      assert.deepEqual(action.data, {
        widget_name: "weather",
        widget_size: "medium",
      });
    });

    it("does not dispatch a second impression after the first", () => {
      const wrapper = mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={() => {}}
        />
      );
      const observerInstance = observerStub.getCall(0).returnValue;
      const el = wrapper.find("div").getDOMNode();

      observerInstance.callback([{ isIntersecting: true, target: el }]);
      observerInstance.callback([{ isIntersecting: true, target: el }]);

      assert.calledOnce(dispatch);
    });

    it("observes an element that mounts after the initial render", () => {
      const wrapper = mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          showEl={false}
          onRender={() => {}}
        />
      );
      const observerInstance = observerStub.getCall(0).returnValue;
      // Initial render: no element, observer didn't observe anything yet.
      assert.notCalled(observerInstance.observe);

      // Later render reveals the element; the callback ref should observe it.
      wrapper.setProps({ showEl: true });
      assert.calledOnce(observerInstance.observe);

      const el = wrapper.find("div").getDOMNode();
      observerInstance.callback([{ isIntersecting: true, target: el }]);
      assert.calledOnce(dispatch);
      assert.equal(dispatch.getCall(0).args[0].type, at.WIDGETS_IMPRESSION);
    });

    it("ignores a queued intersection entry for a previously-unobserved target", () => {
      const wrapper = mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={() => {}}
        />
      );
      const observerInstance = observerStub.getCall(0).returnValue;
      const firstEl = wrapper.find("div").getDOMNode();

      // Reassign the ref to a different node; firstEl is no longer the
      // observed target.
      wrapper.setProps({ showEl: false });
      wrapper.setProps({ showEl: true });

      // A queued callback for the old target fires; hook must not dispatch.
      observerInstance.callback([{ isIntersecting: true, target: firstEl }]);

      assert.notCalled(dispatch);
    });

    it("unobserves the previous element when the ref is reassigned", () => {
      const wrapper = mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={() => {}}
        />
      );
      const observerInstance = observerStub.getCall(0).returnValue;
      const firstEl = wrapper.find("div").getDOMNode();
      assert.calledOnce(observerInstance.observe);
      assert.calledWith(observerInstance.observe, firstEl);

      // Force the element to remount with a different node.
      wrapper.setProps({ showEl: false });
      assert.calledOnce(observerInstance.unobserve);
      assert.calledWith(observerInstance.unobserve, firstEl);

      wrapper.setProps({ showEl: true });
      const secondEl = wrapper.find("div").getDOMNode();
      assert.calledTwice(observerInstance.observe);
      assert.equal(observerInstance.observe.lastCall.args[0], secondEl);
    });
  });

  describe("recordImpression", () => {
    it("dispatches WIDGETS_IMPRESSION manually with the current size", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          showEl={false}
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordImpression();

      assert.calledOnce(dispatch);
      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.WIDGETS_IMPRESSION);
      assert.deepEqual(action.data, {
        widget_name: "weather",
        widget_size: "medium",
      });
    });

    it("shares the impressionFired guard with the observer", () => {
      let telemetry;
      const wrapper = mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );
      const observerInstance = observerStub.getCall(0).returnValue;
      const el = wrapper.find("div").getDOMNode();

      observerInstance.callback([{ isIntersecting: true, target: el }]);
      telemetry.recordImpression();

      assert.calledOnce(dispatch);
    });

    it("honors per-call size override", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          showEl={false}
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordImpression({ size: "large" });

      assert.equal(dispatch.getCall(0).args[0].data.widget_size, "large");
    });
  });

  describe("recordUserAction", () => {
    it("dispatches WIDGETS_USER_EVENT via OnlyToMain by default", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="small"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordUserAction("learn_more", { source: "context_menu" });

      assert.calledOnce(dispatch);
      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.WIDGETS_USER_EVENT);
      assert.equal(action.meta.to, "ActivityStream:Main");
      assert.equal(action.meta.skipLocal, true);
      assert.deepEqual(action.data, {
        widget_name: "weather",
        widget_size: "small",
        widget_source: "context_menu",
        user_action: "learn_more",
      });
    });

    it("dispatches via AlsoToMain when alsoToMain: true", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={LISTS_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordUserAction("task_complete", {
        source: "widget",
        alsoToMain: true,
      });

      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.WIDGETS_USER_EVENT);
      assert.equal(action.meta.to, "ActivityStream:Main");
      assert.notEqual(action.meta.skipLocal, true);
    });

    it("includes action_value when value is provided", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordUserAction("change_temperature_units", {
        source: "context_menu",
        value: "c",
      });

      assert.equal(dispatch.getCall(0).args[0].data.action_value, "c");
    });

    it("omits action_value when value is not provided", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordUserAction("learn_more", { source: "context_menu" });

      assert.notProperty(dispatch.getCall(0).args[0].data, "action_value");
    });

    it("reads the latest widget_size after a prop change", () => {
      let telemetry;
      const wrapper = mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="small"
          onRender={t => (telemetry = t)}
        />
      );

      wrapper.setProps({ widgetSize: "large" });
      telemetry.recordUserAction("provider_link_click", { source: "widget" });

      assert.equal(dispatch.getCall(0).args[0].data.widget_size, "large");
    });

    it("honors an explicit size override", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordUserAction("change_size", {
        source: "context_menu",
        value: "small",
        size: "small",
      });

      assert.equal(dispatch.getCall(0).args[0].data.widget_size, "small");
    });
  });

  describe("recordEnabled", () => {
    it("dispatches WIDGETS_ENABLED with enabled flag and widget_size", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordEnabled(false, { source: "context_menu" });

      assert.calledOnce(dispatch);
      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.WIDGETS_ENABLED);
      assert.deepEqual(action.data, {
        widget_name: "weather",
        widget_size: "medium",
        widget_source: "context_menu",
        enabled: false,
      });
    });

    it("honors size override", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordEnabled(true, { source: "widget", size: "large" });

      assert.equal(dispatch.getCall(0).args[0].data.widget_size, "large");
      assert.equal(dispatch.getCall(0).args[0].data.enabled, true);
    });
  });

  describe("recordError", () => {
    it("dispatches WIDGETS_ERROR with error_type and no widget_source", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordError("load_error");

      assert.calledOnce(dispatch);
      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.WIDGETS_ERROR);
      assert.deepEqual(action.data, {
        widget_name: "weather",
        widget_size: "medium",
        error_type: "load_error",
      });
      assert.notProperty(action.data, "widget_source");
    });

    it("honors size override", () => {
      let telemetry;
      mount(
        <TestComponent
          dispatch={dispatch}
          widget={WEATHER_WIDGET}
          widgetSize="medium"
          onRender={t => (telemetry = t)}
        />
      );

      telemetry.recordError("load_error", { size: "small" });

      assert.equal(dispatch.getCall(0).args[0].data.widget_size, "small");
    });
  });

  // Bug 2012779 transition: WIDGETS_TIMER_* / WIDGETS_LISTS_* legacy events
  // co-dispatch alongside the unified events. Delete this block once they go.
  describe("legacy co-dispatch", () => {
    describe("impression", () => {
      it("co-dispatches legacy impression types BEFORE WIDGETS_IMPRESSION", () => {
        const wrapper = mount(
          <TestComponent
            dispatch={dispatch}
            widget={FOCUS_TIMER_WIDGET}
            widgetSize="large"
            legacyImpressionTypes={[at.WIDGETS_TIMER_USER_IMPRESSION]}
            onRender={() => {}}
          />
        );
        const observerInstance = observerStub.getCall(0).returnValue;
        const el = wrapper.find("div").getDOMNode();

        observerInstance.callback([{ isIntersecting: true, target: el }]);

        assert.calledTwice(dispatch);
        assert.equal(
          dispatch.getCall(0).args[0].type,
          at.WIDGETS_TIMER_USER_IMPRESSION
        );
        assert.equal(dispatch.getCall(1).args[0].type, at.WIDGETS_IMPRESSION);
      });
    });

    describe("user event", () => {
      it("co-dispatches the legacy user-event type BEFORE the unified event when legacy: true", () => {
        let telemetry;
        mount(
          <TestComponent
            dispatch={dispatch}
            widget={FOCUS_TIMER_WIDGET}
            widgetSize="large"
            legacyUserEventType={at.WIDGETS_TIMER_USER_EVENT}
            onRender={t => (telemetry = t)}
          />
        );

        telemetry.recordUserAction("timer_play", {
          source: "widget",
          legacy: true,
        });

        assert.calledTwice(dispatch);
        const [legacy] = dispatch.getCall(0).args;
        const [modern] = dispatch.getCall(1).args;
        assert.equal(legacy.type, at.WIDGETS_TIMER_USER_EVENT);
        assert.deepEqual(legacy.data, { userAction: "timer_play" });
        assert.equal(modern.type, at.WIDGETS_USER_EVENT);
      });

      it("does NOT co-dispatch legacy when legacy flag is omitted", () => {
        let telemetry;
        mount(
          <TestComponent
            dispatch={dispatch}
            widget={FOCUS_TIMER_WIDGET}
            widgetSize="large"
            legacyUserEventType={at.WIDGETS_TIMER_USER_EVENT}
            onRender={t => (telemetry = t)}
          />
        );

        telemetry.recordUserAction("change_size", {
          source: "context_menu",
          value: "small",
          size: "small",
        });

        assert.calledOnce(dispatch);
        assert.equal(dispatch.getCall(0).args[0].type, at.WIDGETS_USER_EVENT);
      });

      it("legacy co-dispatch follows the alsoToMain routing flag", () => {
        let telemetry;
        mount(
          <TestComponent
            dispatch={dispatch}
            widget={LISTS_WIDGET}
            widgetSize="medium"
            legacyUserEventType={at.WIDGETS_LISTS_USER_EVENT}
            onRender={t => (telemetry = t)}
          />
        );

        telemetry.recordUserAction("task_complete", {
          source: "widget",
          alsoToMain: true,
          legacy: true,
        });

        assert.calledTwice(dispatch);
        assert.notEqual(dispatch.getCall(0).args[0].meta.skipLocal, true);
        assert.notEqual(dispatch.getCall(1).args[0].meta.skipLocal, true);
      });
    });
  });
});
