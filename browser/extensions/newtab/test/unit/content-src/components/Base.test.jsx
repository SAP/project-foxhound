import {
  _Base as Base,
  BaseContent,
  WithDsAdmin,
} from "content-src/components/Base/Base";
import { DiscoveryStreamAdmin } from "content-src/components/DiscoveryStreamAdmin/DiscoveryStreamAdmin";
import { ErrorBoundary } from "content-src/components/ErrorBoundary/ErrorBoundary";
import { DiscoveryStreamBase } from "content-src/components/DiscoveryStreamBase/DiscoveryStreamBase";
import { ExternalComponentWrapper } from "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper";
import { TopSites } from "content-src/components/TopSites/TopSites";
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

  it("should not attach an event listener for visibility change if it is visible immediately", () => {
    const props = Object.assign({}, DEFAULT_PROPS, {
      document: {
        visibilityState: "visible",
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
      },
    });

    shallow(<BaseContent {...props} />);
    assert.notCalled(props.document.addEventListener);
  });
  it("should attach an event listener for visibility change if it is not visible", () => {
    const props = Object.assign({}, DEFAULT_PROPS, {
      document: {
        visibilityState: "hidden",
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
      },
    });

    shallow(<BaseContent {...props} />);
    assert.calledWith(props.document.addEventListener, "visibilitychange");
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

    shallow(<BaseContent {...props} />);
    assert.equal(listeners.size, 1);

    // Simulate listeners getting called
    props.document.visibilityState = "visible";
    listeners.forEach(l => l());

    assert.equal(listeners.size, 0);
  });
});

describe("<BaseContent> wallpaper update logic", () => {
  const DOCUMENT_STUB = {
    visibilityState: "visible",
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
  };

  const makeWallpaperProps = (prefsOverride = {}) => ({
    store: { getState: () => {} },
    App: { initialized: true, isForStartupCache: { Wallpaper: false } },
    Prefs: {
      values: {
        "newtabWallpapers.enabled": true,
        "newtabWallpapers.user.enabled": true,
        "newtabWallpapers.wallpaper": "beach",
        "newtabWallpapers.initialWallpaper": "",
        "newtabWallpapers.customWallpaper.theme": "",
        "nova.enabled": false,
        ...prefsOverride,
      },
    },
    Sections: [],
    DiscoveryStream: { config: { enabled: false }, spocs: {} },
    Wallpapers: { wallpaperList: [], uploadedWallpaper: null },
    dispatch: () => {},
    document: DOCUMENT_STUB,
  });

  it("should call updateWallpaper when wallpaper is just enabled (wasWallpaperActive false, isWallpaperActive true)", () => {
    const props = makeWallpaperProps();
    const wrapper = shallow(<BaseContent {...props} />);
    const instance = wrapper.instance();
    const updateSpy = sinon.spy(instance, "updateWallpaper");

    const prevProps = {
      ...props,
      Prefs: {
        values: {
          ...props.Prefs.values,
          "newtabWallpapers.enabled": false,
        },
      },
    };

    instance.componentDidUpdate(prevProps);
    assert.calledOnce(updateSpy);
  });

  it("should call updateWallpaper when wallpaper is just disabled (wasWallpaperActive true, isWallpaperActive false)", () => {
    const props = makeWallpaperProps({
      "newtabWallpapers.enabled": false,
    });
    const wrapper = shallow(<BaseContent {...props} />);
    const instance = wrapper.instance();
    const updateSpy = sinon.spy(instance, "updateWallpaper");

    const prevProps = {
      ...props,
      Prefs: {
        values: {
          ...props.Prefs.values,
          "newtabWallpapers.enabled": true,
        },
      },
    };

    instance.componentDidUpdate(prevProps);
    assert.calledOnce(updateSpy);
  });

  it("should call updateWallpaper when the selected wallpaper changes", () => {
    const props = makeWallpaperProps();
    const wrapper = shallow(<BaseContent {...props} />);
    const instance = wrapper.instance();
    const updateSpy = sinon.spy(instance, "updateWallpaper");

    const prevProps = {
      ...props,
      Prefs: {
        values: {
          ...props.Prefs.values,
          "newtabWallpapers.wallpaper": "mountains",
        },
      },
    };

    instance.componentDidUpdate(prevProps);
    assert.calledOnce(updateSpy);
  });

  it("should not call updateWallpaper when wallpaper is active but nothing changed", () => {
    const props = makeWallpaperProps();
    const wrapper = shallow(<BaseContent {...props} />);
    const instance = wrapper.instance();
    const updateSpy = sinon.spy(instance, "updateWallpaper");

    instance.componentDidUpdate(props);
    assert.notCalled(updateSpy);
  });

  it("should call updateWallpaper when uploadedWallpaper changes", () => {
    const props = makeWallpaperProps();
    const wrapper = shallow(<BaseContent {...props} />);
    const instance = wrapper.instance();
    const updateSpy = sinon.spy(instance, "updateWallpaper");

    const prevProps = {
      ...props,
      Wallpapers: { wallpaperList: [], uploadedWallpaper: "old-url" },
    };

    instance.componentDidUpdate(prevProps);
    assert.calledOnce(updateSpy);
  });

  it("should call updateWallpaper with Nova when both system and user prefs are enabled", () => {
    const props = makeWallpaperProps({ "nova.enabled": true });
    const wrapper = shallow(<BaseContent {...props} />);
    const instance = wrapper.instance();
    const updateSpy = sinon.spy(instance, "updateWallpaper");

    const prevProps = {
      ...props,
      Prefs: {
        values: {
          ...props.Prefs.values,
          "nova.enabled": true,
          "newtabWallpapers.wallpaper": "old-wallpaper",
        },
      },
    };

    instance.componentDidUpdate(prevProps);
    assert.calledOnce(updateSpy);
  });

  it("should not call updateWallpaper with Nova when user pref is disabled even if system pref is on", () => {
    const props = makeWallpaperProps({
      "nova.enabled": true,
      "newtabWallpapers.user.enabled": false,
    });
    const wrapper = shallow(<BaseContent {...props} />);
    const instance = wrapper.instance();
    const updateSpy = sinon.spy(instance, "updateWallpaper");

    const prevProps = {
      ...props,
      Prefs: {
        values: {
          ...props.Prefs.values,
          "nova.enabled": true,
          "newtabWallpapers.user.enabled": false,
          "newtabWallpapers.wallpaper": "old-wallpaper",
        },
      },
    };

    instance.componentDidUpdate(prevProps);
    assert.notCalled(updateSpy);
  });
});

function makeASRouterMessages({ position, isVisible = true } = {}) {
  return {
    isVisible,
    messageData: {
      content: {
        messageType: "ASRouterNewTabMessage",
        ...(position !== undefined ? { position } : {}),
      },
    },
  };
}

function findASRouterMessagePositionIndices(wrapper, containerSelector) {
  const children = wrapper.find(containerSelector).children();
  const indices = { messageIdx: -1, topSitesIdx: -1, contentFeedIdx: -1 };

  children.forEach((child, i) => {
    if (
      child
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE").length
    ) {
      indices.messageIdx = i;
    }
    if (child.find(TopSites).length) {
      indices.topSitesIdx = i;
    }
    if (child.find(DiscoveryStreamBase).length) {
      indices.contentFeedIdx = i;
    }
  });

  return indices;
}

describe("<BaseContent> Nova layout ASRouterNewTabMessage positions", () => {
  const DOCUMENT_STUB = {
    visibilityState: "visible",
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
  };

  const NOVA_BASE_PROPS = {
    store: { getState: () => {} },
    App: { initialized: true },
    Prefs: {
      values: {
        "nova.enabled": true,
        "feeds.topsites": true,
      },
    },
    Sections: [],
    DiscoveryStream: {
      config: { enabled: true },
      spocs: {},
      feeds: { loaded: true },
      showTopicSelection: false,
    },
    dispatch: () => {},
    document: DOCUMENT_STUB,
  };

  it("does not render ASRouterNewTabMessage when there is no message", () => {
    const wrapper = shallow(<BaseContent {...NOVA_BASE_PROPS} />);
    assert.lengthOf(
      wrapper
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
      0
    );
  });

  it("does not render ASRouterNewTabMessage when isVisible is false", () => {
    const wrapper = shallow(
      <BaseContent
        {...NOVA_BASE_PROPS}
        Messages={makeASRouterMessages({ isVisible: false })}
      />
    );
    assert.lengthOf(
      wrapper
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
      0
    );
  });

  it("renders exactly one ASRouterNewTabMessage for any configured position", () => {
    for (const position of [
      "ABOVE_TOPSITES",
      "ABOVE_WIDGETS",
      "ABOVE_CONTENT_FEED",
    ]) {
      const wrapper = shallow(
        <BaseContent
          {...NOVA_BASE_PROPS}
          Messages={makeASRouterMessages({ position })}
        />
      );
      assert.lengthOf(
        wrapper
          .find(ExternalComponentWrapper)
          .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
        1,
        `expected exactly one message for position ${position}`
      );
    }
  });

  it("renders ASRouterNewTabMessage before TopSites for ABOVE_TOPSITES", () => {
    const wrapper = shallow(
      <BaseContent
        {...NOVA_BASE_PROPS}
        Messages={makeASRouterMessages({ position: "ABOVE_TOPSITES" })}
      />
    );
    const { messageIdx, topSitesIdx } = findASRouterMessagePositionIndices(
      wrapper,
      ".content"
    );

    assert.isAbove(topSitesIdx, -1, "TopSites should be present");
    assert.isAbove(messageIdx, -1, "message should be present");
    assert.isBelow(
      messageIdx,
      topSitesIdx,
      "message should come before TopSites"
    );
  });

  it("renders ASRouterNewTabMessage after TopSites and before the content feed for ABOVE_WIDGETS", () => {
    const wrapper = shallow(
      <BaseContent
        {...NOVA_BASE_PROPS}
        Messages={makeASRouterMessages({ position: "ABOVE_WIDGETS" })}
      />
    );
    const { messageIdx, topSitesIdx, contentFeedIdx } =
      findASRouterMessagePositionIndices(wrapper, ".content");

    assert.isAbove(topSitesIdx, -1, "TopSites should be present");
    assert.isAbove(contentFeedIdx, -1, "content feed should be present");
    assert.isAbove(messageIdx, -1, "message should be present");
    assert.isAbove(
      messageIdx,
      topSitesIdx,
      "message should come after TopSites"
    );
    assert.isBelow(
      messageIdx,
      contentFeedIdx,
      "message should come before the content feed"
    );
  });

  it("renders ASRouterNewTabMessage before the content feed for ABOVE_CONTENT_FEED", () => {
    const wrapper = shallow(
      <BaseContent
        {...NOVA_BASE_PROPS}
        Messages={makeASRouterMessages({ position: "ABOVE_CONTENT_FEED" })}
      />
    );
    const { messageIdx, topSitesIdx, contentFeedIdx } =
      findASRouterMessagePositionIndices(wrapper, ".content");

    assert.isAbove(topSitesIdx, -1, "TopSites should be present");
    assert.isAbove(contentFeedIdx, -1, "content feed should be present");
    assert.isAbove(messageIdx, -1, "message should be present");
    assert.isAbove(
      messageIdx,
      topSitesIdx,
      "message should come after TopSites"
    );
    assert.isBelow(
      messageIdx,
      contentFeedIdx,
      "message should come before the content feed"
    );
  });
});

describe("<BaseContent> non-Nova classic layout ASRouterNewTabMessage positions", () => {
  const DOCUMENT_STUB = {
    visibilityState: "visible",
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
  };

  const NON_NOVA_BASE_PROPS = {
    store: { getState: () => {} },
    App: { initialized: true },
    Prefs: {
      values: {
        "nova.enabled": false,
      },
    },
    Sections: [],
    DiscoveryStream: {
      config: { enabled: true },
      spocs: {},
    },
    dispatch: () => {},
    document: DOCUMENT_STUB,
  };

  it("does not render ASRouterNewTabMessage when there is no message", () => {
    const wrapper = shallow(<BaseContent {...NON_NOVA_BASE_PROPS} />);
    assert.lengthOf(
      wrapper
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
      0
    );
  });

  it("does not render ASRouterNewTabMessage when isVisible is false", () => {
    const wrapper = shallow(
      <BaseContent
        {...NON_NOVA_BASE_PROPS}
        Messages={makeASRouterMessages({ isVisible: false })}
      />
    );
    assert.lengthOf(
      wrapper
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
      0
    );
  });

  it("renders ASRouterNewTabMessage before the content area for ABOVE_TOPSITES", () => {
    const wrapper = shallow(
      <BaseContent
        {...NON_NOVA_BASE_PROPS}
        Messages={makeASRouterMessages({ position: "ABOVE_TOPSITES" })}
      />
    );
    const { messageIdx, contentFeedIdx } = findASRouterMessagePositionIndices(
      wrapper,
      ".body-wrapper"
    );

    assert.isAbove(messageIdx, -1, "message should be present");
    assert.isAbove(contentFeedIdx, -1, "content area should be present");
    assert.isBelow(
      messageIdx,
      contentFeedIdx,
      "message should come before the content area"
    );
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
