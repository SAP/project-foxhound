import {
  _Base as Base,
  BaseContent,
  WithDsAdmin,
} from "content-src/components/Base/Base";
import { DiscoveryStreamAdmin } from "content-src/components/DiscoveryStreamAdmin/DiscoveryStreamAdmin";
import { ErrorBoundary } from "content-src/components/ErrorBoundary/ErrorBoundary";
import React from "react";
import { Search } from "content-src/components/Search/Search";
import { shallow } from "enzyme";
import { actionCreators as ac } from "common/Actions.mjs";

describe("<Base>", () => {
  let DEFAULT_PROPS = {
    store: { getState: () => {} },
    App: { initialized: true },
    Prefs: { values: {} },
    Sections: [],
    DiscoveryStream: { config: { enabled: false } },
    dispatch: () => {},
    adminContent: {
      message: {},
    },
    document: {
      visibilityState: "visible",
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
    },
  };

  it("should render Base component", () => {
    const wrapper = shallow(<Base {...DEFAULT_PROPS} />);
    assert.ok(wrapper.exists());
  });

  it("should render the BaseContent component, passing through all props", () => {
    const wrapper = shallow(<Base {...DEFAULT_PROPS} />);
    const props = wrapper.find(BaseContent).props();
    assert.deepEqual(
      props,
      DEFAULT_PROPS,
      JSON.stringify([props, DEFAULT_PROPS], null, 3)
    );
  });

  it("should render an ErrorBoundary with class base-content-fallback", () => {
    const wrapper = shallow(<Base {...DEFAULT_PROPS} />);

    assert.equal(
      wrapper.find(ErrorBoundary).first().prop("className"),
      "base-content-fallback"
    );
  });

  it("should render an WithDsAdmin if the devtools pref is true", () => {
    const wrapper = shallow(
      <Base
        {...DEFAULT_PROPS}
        Prefs={{ values: { "asrouter.devtoolsEnabled": true } }}
      />
    );
    assert.lengthOf(wrapper.find(WithDsAdmin), 1);
  });

  it("should not render an WithDsAdmin if the devtools pref is false", () => {
    const wrapper = shallow(
      <Base
        {...DEFAULT_PROPS}
        Prefs={{ values: { "asrouter.devtoolsEnabled": false } }}
      />
    );
    assert.lengthOf(wrapper.find(WithDsAdmin), 0);
  });
});

describe("<BaseContent>", () => {
  let DEFAULT_PROPS = {
    store: { getState: () => {} },
    App: { initialized: true },
    Prefs: { values: {} },
    Sections: [],
    DiscoveryStream: { config: { enabled: false }, spocs: {} },
    dispatch: () => {},
    document: {
      visibilityState: "visible",
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
    },
  };

  it("should render an ErrorBoundary with a Search child", () => {
    const searchEnabledProps = Object.assign({}, DEFAULT_PROPS, {
      Prefs: { values: { showSearch: true } },
    });

    const wrapper = shallow(<BaseContent {...searchEnabledProps} />);

    assert.isTrue(wrapper.find(Search).parent().is(ErrorBoundary));
  });

  it("should dispatch a user event when the customize menu is opened or closed", () => {
    const dispatch = sinon.stub();
    const wrapper = shallow(
      <BaseContent
        {...DEFAULT_PROPS}
        dispatch={dispatch}
        App={{ customizeMenuVisible: true }}
      />
    );
    wrapper.instance().openCustomizationMenu();
    assert.calledWith(dispatch, { type: "SHOW_PERSONALIZE" });
    assert.calledWith(dispatch, ac.UserEvent({ event: "SHOW_PERSONALIZE" }));
    wrapper.instance().closeCustomizationMenu();
    assert.calledWith(dispatch, { type: "HIDE_PERSONALIZE" });
    assert.calledWith(dispatch, ac.UserEvent({ event: "HIDE_PERSONALIZE" }));
  });

  it("should render only search if no Sections are enabled", () => {
    const onlySearchProps = Object.assign({}, DEFAULT_PROPS, {
      Sections: [{ id: "highlights", enabled: false }],
      Prefs: { values: { showSearch: true } },
    });

    const wrapper = shallow(<BaseContent {...onlySearchProps} />);
    assert.lengthOf(wrapper.find(".only-search"), 1);
  });

  it("should update firstVisibleTimestamp if it is visible immediately with no event listener", () => {
    const props = Object.assign({}, DEFAULT_PROPS, {
      document: {
        visibilityState: "visible",
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
      },
    });

    const wrapper = shallow(<BaseContent {...props} />);
    assert.notCalled(props.document.addEventListener);
    assert.isDefined(wrapper.state("firstVisibleTimestamp"));
  });
  it("should attach an event listener for visibility change if it is not visible", () => {
    const props = Object.assign({}, DEFAULT_PROPS, {
      document: {
        visibilityState: "hidden",
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
      },
    });

    const wrapper = shallow(<BaseContent {...props} />);
    assert.calledWith(props.document.addEventListener, "visibilitychange");
    assert.notExists(wrapper.state("firstVisibleTimestamp"));
  });
  it("should remove the event listener for visibility change when unmounted", () => {
    const props = Object.assign({}, DEFAULT_PROPS, {
      document: {
        visibilityState: "hidden",
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
      },
    });

    const wrapper = shallow(<BaseContent {...props} />);
    const [, listener] = props.document.addEventListener.firstCall.args;

    wrapper.unmount();
    assert.calledWith(
      props.document.removeEventListener,
      "visibilitychange",
      listener
    );
  });
  it("should remove the event listener for visibility change after becoming visible", () => {
    const listeners = new Set();
    const props = Object.assign({}, DEFAULT_PROPS, {
      document: {
        visibilityState: "hidden",
        addEventListener: (ev, cb) => listeners.add(cb),
        removeEventListener: (ev, cb) => listeners.delete(cb),
      },
    });

    const wrapper = shallow(<BaseContent {...props} />);
    assert.equal(listeners.size, 1);
    assert.notExists(wrapper.state("firstVisibleTimestamp"));

    // Simulate listeners getting called
    props.document.visibilityState = "visible";
    listeners.forEach(l => l());

    assert.equal(listeners.size, 0);
    assert.isDefined(wrapper.state("firstVisibleTimestamp"));
  });
});

describe("WithDsAdmin", () => {
  describe("rendering inner content", () => {
    it("should not set devtoolsCollapsed state for about:newtab (no hash)", () => {
      const wrapper = shallow(<WithDsAdmin hash="" />);
      assert.isTrue(
        wrapper.find(DiscoveryStreamAdmin).prop("devtoolsCollapsed")
      );
      assert.lengthOf(wrapper.find(BaseContent), 1);
    });

    it("should set devtoolsCollapsed state for about:newtab#devtools", () => {
      const wrapper = shallow(<WithDsAdmin hash="#devtools" />);
      assert.isFalse(
        wrapper.find(DiscoveryStreamAdmin).prop("devtoolsCollapsed")
      );
      assert.lengthOf(wrapper.find(BaseContent), 0);
    });

    it("should set devtoolsCollapsed state for about:newtab#devtools subroutes", () => {
      const wrapper = shallow(<WithDsAdmin hash="#devtools-foo" />);
      assert.isFalse(
        wrapper.find(DiscoveryStreamAdmin).prop("devtoolsCollapsed")
      );
      assert.lengthOf(wrapper.find(BaseContent), 0);
    });
  });

  describe("SPOC Placeholder Duration Tracking", () => {
    let wrapper;
    let instance;
    let dispatch;
    let clock;
    let baseProps;

    beforeEach(() => {
      // Setup: Create a component with expired spocs (showing placeholders)
      // - useFakeTimers allows us to control time for duration testing
      // - lastUpdated is 120000ms (2 mins) ago, exceeding cacheUpdateTime of 60000ms (1 min)
      // - In this setup, spocs are expired and placeholders should be visible
      clock = sinon.useFakeTimers();
      dispatch = sinon.spy();
      baseProps = {
        store: { getState: () => {} },
        App: { initialized: true },
        Prefs: { values: {} },
        Sections: [],
        Weather: {},
        document: {
          visibilityState: "visible",
          addEventListener: sinon.stub(),
          removeEventListener: sinon.stub(),
        },
      };
      const props = {
        ...baseProps,
        dispatch,
        DiscoveryStream: {
          config: { enabled: true },
          spocs: {
            onDemand: { enabled: true, loaded: false },
            lastUpdated: Date.now() - 120000, // Expired (120s ago)
            cacheUpdateTime: 60000, // Cache expires after 60s
          },
        },
      };
      wrapper = shallow(<BaseContent {...props} />);
      instance = wrapper.instance();
      instance.setState({ visible: true });
    });

    afterEach(() => {
      clock.restore();
    });

    it("should start tracking when placeholders become visible", () => {
      const prevProps = {
        ...baseProps,
        DiscoveryStream: {
          config: { enabled: true },
          spocs: {
            onDemand: { enabled: true, loaded: false },
            lastUpdated: Date.now() - 30000,
            cacheUpdateTime: 60000,
          },
        },
      };

      clock.tick(1000);
      instance.trackSpocPlaceholderDuration(prevProps);

      assert.isNotNull(instance.spocPlaceholderStartTime);
    });

    it("should record duration when placeholders are replaced", () => {
      // Create a fresh wrapper with expired spocs
      const freshDispatch = sinon.spy();
      const expiredTime = Date.now() - 120000;
      const freshWrapper = shallow(
        <BaseContent
          {...baseProps}
          dispatch={freshDispatch}
          DiscoveryStream={{
            config: { enabled: true },
            spocs: {
              onDemand: { enabled: true, loaded: false },
              lastUpdated: expiredTime,
              cacheUpdateTime: 60000,
            },
          }}
        />
      );
      const freshInstance = freshWrapper.instance();
      freshInstance.setState({ visible: true });

      // Advance clock a bit first so startTime is not 0 (which is falsy)
      clock.tick(100);

      // Set start time and advance clock
      const startTime = Date.now();
      freshInstance.spocPlaceholderStartTime = startTime;
      clock.tick(150);

      // Update to fresh spocs - this triggers componentDidUpdate
      // which automatically calls trackSpocPlaceholderDuration
      freshWrapper.setProps({
        ...baseProps,
        dispatch: freshDispatch,
        DiscoveryStream: {
          config: { enabled: true },
          spocs: {
            onDemand: { enabled: true, loaded: false },
            lastUpdated: Date.now(),
            cacheUpdateTime: 60000,
          },
        },
      });

      // componentDidUpdate should have dispatched the placeholder duration action
      const placeholderCall = freshDispatch
        .getCalls()
        .find(
          call =>
            call.args[0].type === "DISCOVERY_STREAM_SPOC_PLACEHOLDER_DURATION"
        );

      assert.isNotNull(
        placeholderCall,
        "Placeholder duration action should be dispatched"
      );
      const [action] = placeholderCall.args;
      assert.equal(action.data.duration, 150);
      assert.deepEqual(action.meta, {
        from: "ActivityStream:Content",
        to: "ActivityStream:Main",
        skipLocal: true,
      });

      assert.isNull(freshInstance.spocPlaceholderStartTime);
    });

    it("should start tracking on onVisible if placeholders already expired", () => {
      wrapper.setProps({
        DiscoveryStream: {
          config: { enabled: true },
          spocs: {
            onDemand: { enabled: true, loaded: false },
            lastUpdated: Date.now() - 120000,
            cacheUpdateTime: 60000,
          },
        },
      });

      instance.setState({ visible: false });
      instance.spocPlaceholderStartTime = null;

      instance.onVisible();

      assert.isNotNull(instance.spocPlaceholderStartTime);
    });

    it("should not start tracking if tab is not visible", () => {
      instance.setState({ visible: false });
      instance.spocPlaceholderStartTime = null;

      const prevProps = {
        ...baseProps,
        DiscoveryStream: {
          config: { enabled: true },
          spocs: {
            onDemand: { enabled: true, loaded: false },
            lastUpdated: Date.now() - 30000,
            cacheUpdateTime: 60000,
          },
        },
      };

      instance.trackSpocPlaceholderDuration(prevProps);

      assert.isNull(instance.spocPlaceholderStartTime);
    });

    it("should not start tracking if onDemand is disabled", () => {
      // Reset instance to have onDemand disabled from the start
      const props = {
        ...baseProps,
        dispatch,
        DiscoveryStream: {
          config: { enabled: true },
          spocs: {
            onDemand: { enabled: false, loaded: false },
            lastUpdated: Date.now() - 120000,
            cacheUpdateTime: 60000,
          },
        },
      };
      wrapper = shallow(<BaseContent {...props} />);
      instance = wrapper.instance();
      instance.setState({ visible: true });
      instance.spocPlaceholderStartTime = null;

      const prevProps = {
        ...baseProps,
        DiscoveryStream: {
          config: { enabled: true },
          spocs: {
            onDemand: { enabled: false, loaded: false },
            lastUpdated: Date.now() - 120000,
            cacheUpdateTime: 60000,
          },
        },
      };

      instance.trackSpocPlaceholderDuration(prevProps);

      assert.isNull(instance.spocPlaceholderStartTime);
    });
  });
});
