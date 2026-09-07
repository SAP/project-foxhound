import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import {
  DiscoveryStreamAdminInner,
  DiscoveryStreamAdminUI,
  ToggleStoryButton,
} from "content-src/components/DiscoveryStreamAdmin/DiscoveryStreamAdmin";
import React from "react";
import { shallow } from "enzyme";

describe("DiscoveryStreamAdmin", () => {
  let sandbox;
  let wrapper;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    wrapper = shallow(
      <DiscoveryStreamAdminInner
        collapsed={false}
        location={{ routes: [""] }}
        Prefs={{}}
      />
    );
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("should render DiscoveryStreamAdmin component", () => {
    assert.ok(wrapper.exists());
  });
  it("should set a .collapsed class on the outer div if props.collapsed is true", () => {
    wrapper.setProps({ collapsed: true });
    assert.isTrue(wrapper.find(".discoverystream-admin").hasClass("collapsed"));
  });
  it("should set a .expanded class on the outer div if props.collapsed is false", () => {
    wrapper.setProps({ collapsed: false });
    assert.isTrue(wrapper.find(".discoverystream-admin").hasClass("expanded"));
    assert.isFalse(
      wrapper.find(".discoverystream-admin").hasClass("collapsed")
    );
  });
  it("should render a DS section", () => {
    assert.equal(wrapper.find("h1").at(0).text(), "Discovery Stream Admin");
  });

  describe("#DiscoveryStream", () => {
    let state = {};
    let dispatch;
    const getDebugFeatures = ({
      artsCurrent = 0,
      artsOverride = undefined,
      sportsCurrent = 0,
      sportsOverride = undefined,
    } = {}) => ({
      arts: {
        numValues: 4,
        currentValue: artsCurrent,
        ...(artsOverride !== undefined ? { overrideValue: artsOverride } : {}),
      },
      sports: {
        numValues: 4,
        currentValue: sportsCurrent,
        ...(sportsOverride !== undefined
          ? { overrideValue: sportsOverride }
          : {}),
      },
    });

    const getInferredState = debugFeatures => ({
      inferredInterests: {},
      coarseInferredInterests: {},
      coarsePrivateInferredInterests: {},
      debugFeatures,
    });

    beforeEach(() => {
      dispatch = sandbox.stub();
      state = {
        config: {
          enabled: true,
        },
        layout: [],
        spocs: {
          frequency_caps: [],
        },
        feeds: {
          data: {},
        },
        blocks: {},
        impressions: {
          feed: {},
        },
      };
      wrapper = shallow(
        <DiscoveryStreamAdminUI
          dispatch={dispatch}
          otherPrefs={{
            "discoverystream.contextualContent.selectedFeed": "foo",
            "discoverystream.contextualContent.feeds": "foo, bar",
          }}
          state={{
            DiscoveryStream: state,
            Weather: {
              suggestions: [],
            },
            InferredPersonalization: getInferredState(null),
          }}
        />
      );
    });
    it("should render a DiscoveryStreamAdminUI component", () => {
      assert.equal(wrapper.find("h3").at(0).text(), "Layout");
    });
    it("should render a spoc in DiscoveryStreamAdminUI component", () => {
      state.spocs = {
        frequency_caps: [],
        data: {
          newtab_spocs: {
            items: [
              {
                id: 12345,
              },
            ],
          },
        },
      };
      wrapper = shallow(
        <DiscoveryStreamAdminUI
          dispatch={dispatch}
          otherPrefs={{
            "discoverystream.contextualContent.selectedFeed": "foo",
            "discoverystream.contextualContent.feeds": "foo, bar",
          }}
          state={{
            DiscoveryStream: state,
            Weather: {
              suggestions: [],
            },
            InferredPersonalization: {
              inferredInterests: {},
              coarseInferredInterests: {},
              coarsePrivateInferredInterests: {},
            },
          }}
        />
      );
      wrapper.instance().onStoryToggle({ id: 12345 });
      const messageSummary = wrapper.find(".message-summary").at(0);
      const pre = messageSummary.find("pre").at(0);
      const spocText = pre.text();
      assert.equal(spocText, '{\n  "id": 12345\n}');
    });
    it("should fire refresh cache with DISCOVERY_STREAM_DEV_REFRESH_CACHE", () => {
      wrapper.find("button").at(0).simulate("click");
      assert.calledWith(
        dispatch,
        ac.OnlyToMain({
          type: at.DISCOVERY_STREAM_DEV_REFRESH_CACHE,
        })
      );
    });
    it("should fire expireCache with DISCOVERY_STREAM_DEV_EXPIRE_CACHE", () => {
      wrapper.find("button").at(1).simulate("click");
      assert.calledWith(
        dispatch,
        ac.OnlyToMain({
          type: at.DISCOVERY_STREAM_DEV_EXPIRE_CACHE,
        })
      );
    });
    it("should fire systemTick with DISCOVERY_STREAM_DEV_SYSTEM_TICK", () => {
      wrapper.find("button").at(2).simulate("click");
      assert.calledWith(
        dispatch,
        ac.OnlyToMain({
          type: at.DISCOVERY_STREAM_DEV_SYSTEM_TICK,
        })
      );
    });
    it("should fire idleDaily with DISCOVERY_STREAM_DEV_IDLE_DAILY", () => {
      wrapper.find("button").at(3).simulate("click");
      assert.calledWith(
        dispatch,
        ac.OnlyToMain({
          type: at.DISCOVERY_STREAM_DEV_IDLE_DAILY,
        })
      );
    });
    it("should fire syncRemoteSettings with DISCOVERY_STREAM_DEV_SYNC_RS", () => {
      wrapper.instance().syncRemoteSettings();
      assert.calledWith(
        dispatch,
        ac.OnlyToMain({
          type: at.DISCOVERY_STREAM_DEV_SYNC_RS,
        })
      );
    });
    describe("inferred personalization overrides controls", () => {
      beforeEach(() => {
        wrapper = shallow(
          <DiscoveryStreamAdminUI
            dispatch={dispatch}
            otherPrefs={{
              "discoverystream.contextualContent.selectedFeed": "foo",
              "discoverystream.contextualContent.feeds": "foo, bar",
              "discoverystream.sections.personalization.inferred.enabled": true,
            }}
            state={{
              DiscoveryStream: state,
              Weather: { suggestions: [] },
              InferredPersonalization: getInferredState(
                getDebugFeatures({ artsCurrent: 1, artsOverride: 2 })
              ),
            }}
          />
        );
      });

      it('should render the "Recompute Interest Vector" button', () => {
        const recomputeButton = wrapper
          .find("button")
          .filterWhere(node => node.text() === "Recompute Interest Vector");
        assert.equal(recomputeButton.length, 1);
      });

      it('should call refreshInferredPersonalizationAndDebug when "Recompute Interest Vector" is clicked', () => {
        const recomputeButton = wrapper
          .find("button")
          .filterWhere(node => node.text() === "Recompute Interest Vector")
          .first();
        recomputeButton.simulate("click");
        assert.calledWith(
          dispatch,
          ac.OnlyToMain({
            type: at.INFERRED_PERSONALIZATION_REFRESH,
          })
        );
      });

      it('should render the "Refresh Story Cache" button', () => {
        const refreshStoryCacheButton = wrapper
          .find("button")
          .filterWhere(node => node.text() === "Refresh Story Cache");
        assert.equal(refreshStoryCacheButton.length, 1);
      });

      it('should call refreshCache when "Refresh Story Cache" is clicked', () => {
        const refreshStoryCacheButton = wrapper
          .find("button")
          .filterWhere(node => node.text() === "Refresh Story Cache")
          .first();
        refreshStoryCacheButton.simulate("click");
        assert.calledWith(
          dispatch,
          ac.OnlyToMain({
            type: at.DISCOVERY_STREAM_DEV_REFRESH_CACHE,
          })
        );
      });

      it("should dispatch null overrides when toggle is turned off", () => {
        wrapper
          .instance()
          .handleDebugOverridesToggle({ target: { pressed: false } });
        assert.calledWith(
          dispatch,
          ac.OnlyToMain({
            type: at.INFERRED_PERSONALIZATION_DEBUG_OVERRIDES_SET,
            data: null,
          })
        );
      });

      it("should keep slider values in pendingOverrides while overrides are off", () => {
        wrapper
          .instance()
          .handleDebugOverridesToggle({ target: { pressed: false } });
        assert.deepEqual(wrapper.state("pendingOverrides"), {
          arts: 2,
          sports: 0,
        });

        wrapper.instance().handleDebugOverrideChange("arts", 3);
        assert.equal(wrapper.state("pendingOverrides").arts, 3);
      });

      it("should restore and send pending overrides when toggle is turned on", () => {
        wrapper.setState({ pendingOverrides: { arts: 3, sports: 1 } });

        wrapper
          .instance()
          .handleDebugOverridesToggle({ target: { pressed: true } });
        assert.calledWith(
          dispatch,
          ac.OnlyToMain({
            type: at.INFERRED_PERSONALIZATION_DEBUG_OVERRIDES_SET,
            data: { arts: 3, sports: 1 },
          })
        );
      });

      it("should reset pending overrides to 0 and send reset when overrides are enabled", () => {
        wrapper.setState({ pendingOverrides: { arts: 3, sports: 1 } });
        wrapper.instance().handleResetAllOverrides();

        assert.deepEqual(wrapper.state("pendingOverrides"), {
          arts: 0,
          sports: 0,
        });
        assert.calledWith(
          dispatch,
          ac.OnlyToMain({
            type: at.INFERRED_PERSONALIZATION_DEBUG_OVERRIDES_SET,
            data: { arts: 0, sports: 0 },
          })
        );
      });

      it("should enable reset button only when at least one override is non-zero", () => {
        wrapper = shallow(
          <DiscoveryStreamAdminUI
            dispatch={dispatch}
            otherPrefs={{
              "discoverystream.contextualContent.selectedFeed": "foo",
              "discoverystream.contextualContent.feeds": "foo, bar",
              "discoverystream.sections.personalization.inferred.enabled": true,
            }}
            state={{
              DiscoveryStream: state,
              Weather: { suggestions: [] },
              InferredPersonalization: getInferredState(
                getDebugFeatures({
                  artsCurrent: 1,
                  artsOverride: 0,
                  sportsOverride: 0,
                })
              ),
            }}
          />
        );
        let resetButton = wrapper
          .find("button")
          .filterWhere(node => node.text() === "Reset overrides")
          .first();
        assert.equal(resetButton.prop("disabled"), true);

        wrapper = shallow(
          <DiscoveryStreamAdminUI
            dispatch={dispatch}
            otherPrefs={{
              "discoverystream.contextualContent.selectedFeed": "foo",
              "discoverystream.contextualContent.feeds": "foo, bar",
              "discoverystream.sections.personalization.inferred.enabled": true,
            }}
            state={{
              DiscoveryStream: state,
              Weather: { suggestions: [] },
              InferredPersonalization: getInferredState(
                getDebugFeatures({
                  artsCurrent: 1,
                  artsOverride: 2,
                  sportsOverride: 0,
                })
              ),
            }}
          />
        );
        resetButton = wrapper
          .find("button")
          .filterWhere(node => node.text() === "Reset overrides")
          .first();
        assert.equal(resetButton.prop("disabled"), null);
      });
    });
  });

  describe("#ToggleStoryButton", () => {
    it("should fire onClick in toggle button", async () => {
      let result = "";
      function onClick(spoc) {
        result = spoc;
      }

      wrapper = shallow(<ToggleStoryButton story="spoc" onClick={onClick} />);
      wrapper.find("button").simulate("click");

      assert.equal(result, "spoc");
    });
  });
});
