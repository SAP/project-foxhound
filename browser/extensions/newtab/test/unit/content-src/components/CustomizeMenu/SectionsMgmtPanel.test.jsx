import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { combineReducers, createStore } from "redux";
import { SectionsMgmtPanel } from "content-src/components/CustomizeMenu/SectionsMgmtPanel/SectionsMgmtPanel";

// Note: The visibility of this component is controlled by the mayHaveTopicSections prop
// which is computed from these prefs in Base.jsx:
// - discoverystream.sections.enabled
// - discoverystream.topicLabels.enabled
// - discoverystream.sections.customizeMenuPanel.enabled
// - discoverystream.sections.personalization.enabled
// See ContentSection.test.jsx for tests of the visibility behavior.

const DEFAULT_STATE = {
  ...INITIAL_STATE,
  DiscoveryStream: {
    ...INITIAL_STATE.DiscoveryStream,
    layout: [
      {
        components: [
          {
            type: "CardGrid",
            feed: {
              url: "https://example.com/feed",
            },
          },
        ],
      },
    ],
    feeds: {
      data: {
        "https://example.com/feed": {
          data: {
            sections: [
              {
                sectionKey: "technology",
                title: "Technology",
                receivedRank: 0,
              },
              {
                sectionKey: "science",
                title: "Science",
                receivedRank: 1,
              },
              {
                sectionKey: "sports",
                title: "Sports",
                receivedRank: 2,
              },
            ],
          },
        },
      },
    },
    sectionPersonalization: {},
  },
};

function WrapWithProvider({ children, state = DEFAULT_STATE }) {
  const store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<SectionsMgmtPanel>", () => {
  let wrapper;
  let sandbox;
  let DEFAULT_PROPS;
  const fakeDate = "2020-01-01T00:00:00.000Z";

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    DEFAULT_PROPS = {
      pocketEnabled: true,
      onSubpanelToggle: sandbox.stub(),
      togglePanel: sandbox.stub(),
      showPanel: false,
    };
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    sandbox.restore();
  });

  it("should render the component", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    assert.ok(wrapper.exists());
  });

  it("should render the manage topics button", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    const button = wrapper.find("moz-box-button");
    assert.ok(button.exists());
  });

  it("should disable the button when pocketEnabled is false", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} pocketEnabled={false} />
      </WrapWithProvider>
    );
    const button = wrapper.find("moz-box-button");
    assert.isTrue(button.prop("disabled"));
  });

  it("should call togglePanel when button is clicked", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    wrapper.find("moz-box-button").simulate("click");
    assert.calledOnce(DEFAULT_PROPS.togglePanel);
  });

  it("should render the panel when showPanel is true", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );
    assert.ok(wrapper.find(".sections-mgmt-panel").exists());
  });

  it("should not render the panel when showPanel is false", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={false} />
      </WrapWithProvider>
    );
    assert.isFalse(wrapper.find(".sections-mgmt-panel").exists());
  });

  it("should call onSubpanelToggle when panel opens", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={false} />
      </WrapWithProvider>
    );

    wrapper.setProps({
      children: (
        <SectionsMgmtPanel
          {...DEFAULT_PROPS}
          showPanel={true}
          onSubpanelToggle={DEFAULT_PROPS.onSubpanelToggle}
        />
      ),
    });

    assert.called(DEFAULT_PROPS.onSubpanelToggle);
  });

  it("should call togglePanel when arrow button is clicked (non-nova)", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );

    wrapper.find("button.arrow-button").simulate("click");
    assert.calledOnce(DEFAULT_PROPS.togglePanel);
  });

  it("should call togglePanel when arrow button is clicked (nova)", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel
          {...DEFAULT_PROPS}
          showPanel={true}
          novaEnabled={true}
        />
      </WrapWithProvider>
    );

    wrapper.find("moz-button.arrow-button").simulate("click");
    assert.calledOnce(DEFAULT_PROPS.togglePanel);
  });

  describe("followed topics", () => {
    it("should render empty state when no topics are followed", () => {
      wrapper = mount(
        <WrapWithProvider>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      const emptyStates = wrapper.find(".topic-list-empty-state");
      assert.equal(emptyStates.length, 2);
    });

    it("should render followed topics list when topics are followed", () => {
      const stateWithFollowedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: true,
              isBlocked: false,
              followedAt: fakeDate,
            },
          },
        },
      };

      wrapper = mount(
        <WrapWithProvider state={stateWithFollowedTopics}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      const topicList = wrapper.find(".topic-list").first();
      assert.ok(topicList.exists());
      assert.equal(topicList.find("li").length, 1);
      assert.equal(
        topicList.find("li").first().find("span").first().text(),
        "Technology"
      );
    });

    it("should set localization attributes on the follow/unfollow button for accessible name", () => {
      const stateWithFollowedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: true,
              isBlocked: false,
              followedAt: fakeDate,
            },
          },
        },
      };

      wrapper = mount(
        <WrapWithProvider state={stateWithFollowedTopics}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      const button = wrapper.find("moz-button[section='technology']");
      assert.equal(
        button.prop("data-l10n-id"),
        "newtab-section-unfollow-topic"
      );
      assert.equal(
        button.prop("data-l10n-args"),
        JSON.stringify({ topic: "Technology" })
      );
    });

    it("should dispatch UNFOLLOW_SECTION action when unfollow button is clicked", () => {
      const stateWithFollowedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: true,
              isBlocked: false,
              followedAt: fakeDate,
            },
          },
        },
      };

      const store = createStore(
        combineReducers(reducers),
        stateWithFollowedTopics
      );
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      const unfollowButton = wrapper.find("#follow-topic-technology");
      unfollowButton.simulate("click");

      assert.calledWith(
        dispatchSpy.secondCall,
        sinon.match({
          type: "UNFOLLOW_SECTION",
          data: {
            section: "technology",
            section_position: 0,
            event_source: "CUSTOMIZE_PANEL",
          },
          meta: {
            from: "ActivityStream:Content",
            to: "ActivityStream:Main",
            skipLocal: true,
          },
        })
      );
    });

    it("should dispatch SECTION_PERSONALIZATION_SET when unfollowing", () => {
      const stateWithFollowedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: true,
              isBlocked: false,
              followedAt: fakeDate,
            },
          },
        },
      };

      const store = createStore(
        combineReducers(reducers),
        stateWithFollowedTopics
      );
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      const unfollowButton = wrapper.find("#follow-topic-technology");
      unfollowButton.simulate("click");

      assert.calledWith(
        dispatchSpy.firstCall,
        sinon.match({
          type: "SECTION_PERSONALIZATION_SET",
          data: {},
          meta: {
            from: "ActivityStream:Content",
            to: "ActivityStream:Main",
          },
        })
      );
    });
  });

  describe("blocked topics", () => {
    it("should render empty state when no topics are blocked", () => {
      wrapper = mount(
        <WrapWithProvider>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      const emptyStates = wrapper.find(".topic-list-empty-state");
      assert.equal(emptyStates.length, 2);
    });

    it("should render blocked topics list when topics are blocked", () => {
      const stateWithBlockedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: false,
              isBlocked: true,
            },
          },
        },
      };

      wrapper = mount(
        <WrapWithProvider state={stateWithBlockedTopics}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      const topicList = wrapper.find(".topic-list");
      assert.ok(topicList.exists());
      assert.equal(topicList.find("li").length, 1);
      assert.equal(
        topicList.find("li").first().find("span").first().text(),
        "Technology"
      );
    });

    it("should set localization attributes on the block/unblock button for accessible name", () => {
      const stateWithBlockedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: false,
              isBlocked: true,
            },
          },
        },
      };

      wrapper = mount(
        <WrapWithProvider state={stateWithBlockedTopics}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      const button = wrapper.find("moz-button[section='technology']");
      assert.equal(button.prop("data-l10n-id"), "newtab-section-unblock-topic");
      assert.equal(
        button.prop("data-l10n-args"),
        JSON.stringify({ topic: "Technology" })
      );
    });

    it("should dispatch UNBLOCK_SECTION action when unblock button is clicked", () => {
      const stateWithBlockedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: false,
              isBlocked: true,
            },
          },
        },
      };

      const store = createStore(
        combineReducers(reducers),
        stateWithBlockedTopics
      );
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      const unblockButton = wrapper.find("#blocked-topic-technology");
      unblockButton.simulate("click");

      assert.calledWith(
        dispatchSpy.secondCall,
        sinon.match({
          type: "UNBLOCK_SECTION",
          data: {
            section: "technology",
            section_position: 0,
            event_source: "CUSTOMIZE_PANEL",
          },
          meta: {
            from: "ActivityStream:Content",
            to: "ActivityStream:Main",
            skipLocal: true,
          },
        })
      );
    });

    it("should dispatch SECTION_PERSONALIZATION_SET when unblocking", () => {
      const stateWithBlockedTopics = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            technology: {
              isFollowed: false,
              isBlocked: true,
            },
          },
        },
      };

      const store = createStore(
        combineReducers(reducers),
        stateWithBlockedTopics
      );
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      const unblockButton = wrapper.find("#blocked-topic-technology");
      unblockButton.simulate("click");

      assert.calledWith(
        dispatchSpy.firstCall,
        sinon.match({
          type: "SECTION_PERSONALIZATION_SET",
          data: {},
          meta: {
            from: "ActivityStream:Content",
            to: "ActivityStream:Main",
          },
        })
      );
    });

    it("should render a blocked section absent from the feed using its stored title", () => {
      const stateWithOffFeedBlocked = {
        ...DEFAULT_STATE,
        DiscoveryStream: {
          ...DEFAULT_STATE.DiscoveryStream,
          sectionPersonalization: {
            cooking: {
              isFollowed: false,
              isBlocked: true,
              title: "Cooking",
            },
          },
        },
      };

      wrapper = mount(
        <WrapWithProvider state={stateWithOffFeedBlocked}>
          <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      const topicList = wrapper.find(".topic-list");
      assert.ok(topicList.exists());
      assert.equal(topicList.find("li").length, 1);
      assert.equal(topicList.find("span").first().text(), "Cooking");
    });
  });

  it("should render multiple followed topics", () => {
    const stateWithMultipleFollowed = {
      ...DEFAULT_STATE,
      DiscoveryStream: {
        ...DEFAULT_STATE.DiscoveryStream,
        sectionPersonalization: {
          technology: {
            isFollowed: true,
            isBlocked: false,
            followedAt: fakeDate,
          },
          science: {
            isFollowed: true,
            isBlocked: false,
            followedAt: "2024-01-02T00:00:00.000Z",
          },
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={stateWithMultipleFollowed}>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );

    const topicList = wrapper.find(".topic-list").first();
    assert.equal(topicList.find("li").length, 2);
    assert.include(topicList.text(), "Technology");
    assert.include(topicList.text(), "Science");
  });

  it("should render multiple blocked topics", () => {
    const stateWithMultipleBlocked = {
      ...DEFAULT_STATE,
      DiscoveryStream: {
        ...DEFAULT_STATE.DiscoveryStream,
        sectionPersonalization: {
          technology: {
            isFollowed: false,
            isBlocked: true,
          },
          science: {
            isFollowed: false,
            isBlocked: true,
          },
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={stateWithMultipleBlocked}>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );

    const topicList = wrapper.find(".topic-list");
    assert.equal(topicList.find("li").length, 2);
    assert.include(topicList.text(), "Technology");
    assert.include(topicList.text(), "Science");
  });

  it("should have the correct button classes for followed topics", () => {
    const stateWithFollowedTopics = {
      ...DEFAULT_STATE,
      DiscoveryStream: {
        ...DEFAULT_STATE.DiscoveryStream,
        sectionPersonalization: {
          technology: {
            isFollowed: true,
            isBlocked: false,
            followedAt: fakeDate,
          },
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={stateWithFollowedTopics}>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );

    const followDiv = wrapper.find(".section-follow").first();
    assert.isTrue(followDiv.hasClass("following"));
  });

  it("should have the correct button classes for blocked topics", () => {
    const stateWithBlockedTopics = {
      ...DEFAULT_STATE,
      DiscoveryStream: {
        ...DEFAULT_STATE.DiscoveryStream,
        sectionPersonalization: {
          technology: {
            isFollowed: false,
            isBlocked: true,
          },
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={stateWithBlockedTopics}>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );

    const blockDiv = wrapper.find(".section-block").first();
    assert.isTrue(blockDiv.hasClass("blocked"));
  });

  it("should render panel title and headers (non-nova)", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );

    const panel = wrapper.find(".sections-mgmt-panel");
    assert.ok(panel.exists());
    assert.equal(panel.find("h1").length, 1);
    assert.equal(panel.find("h3").length, 2);
  });

  it("should render without throwing when feed data has failed status (no sections)", () => {
    const stateWithFailedFeed = {
      ...DEFAULT_STATE,
      DiscoveryStream: {
        ...DEFAULT_STATE.DiscoveryStream,
        feeds: {
          data: {
            "https://example.com/feed": {
              data: { status: "failed" },
            },
          },
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={stateWithFailedFeed}>
        <SectionsMgmtPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );

    assert.ok(wrapper.find("moz-box-button").exists());
    const emptyStates = wrapper.find(".topic-list-empty-state");
    assert.equal(emptyStates.length, 2);
  });

  it("should render panel title and headers (nova)", () => {
    wrapper = mount(
      <WrapWithProvider>
        <SectionsMgmtPanel
          {...DEFAULT_PROPS}
          showPanel={true}
          novaEnabled={true}
        />
      </WrapWithProvider>
    );

    const panel = wrapper.find(".sections-mgmt-panel");
    assert.ok(panel.exists());
    assert.equal(panel.find("h2").length, 1);
    assert.equal(panel.find("h3").length, 2);
  });
});
