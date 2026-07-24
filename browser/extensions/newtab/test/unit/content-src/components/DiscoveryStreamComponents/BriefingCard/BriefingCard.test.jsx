import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { BriefingCard } from "content-src/components/DiscoveryStreamComponents/BriefingCard/BriefingCard";
import { SafeAnchor } from "content-src/components/DiscoveryStreamComponents/SafeAnchor/SafeAnchor";
import { ImpressionStats } from "content-src/components/DiscoveryStreamImpressionStats/ImpressionStats";
import { combineReducers, createStore } from "redux";
import { actionTypes as at } from "common/Actions.mjs";

const DEFAULT_PROPS = {
  sectionClassNames: "col-1-medium",
  headlines: [
    {
      id: "headline-1",
      url: "https://example.com/1",
      title: "First Headline",
      publisher: "Publisher One",
      icon_src: "https://example.com/icon1.png",
      pos: 0,
      recommendation_id: "rec-1",
      section: "daily-brief",
    },
    {
      id: "headline-2",
      url: "https://example.com/2",
      title: "Second Headline",
      publisher: "Publisher Two",
      icon_src: "https://example.com/icon2.png",
      pos: 1,
      recommendation_id: "rec-2",
      section: "daily-brief",
    },
    {
      id: "headline-3",
      url: "https://example.com/3",
      title: "Third Headline",
      publisher: "Publisher Three",
      icon_src: "https://example.com/icon3.png",
      pos: 2,
      recommendation_id: "rec-3",
      section: "daily-brief",
    },
  ],
  lastUpdated: Date.now(),
  selectedTopics: ["topic1", "topic2"],
  isFollowed: true,
  firstVisibleTimestamp: Date.now() - 5000,
};

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<BriefingCard>", () => {
  let wrapper;
  let sandbox;
  let dispatch;
  let clock;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    wrapper = mount(
      <WrapWithProvider>
        <BriefingCard dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
  });

  afterEach(() => {
    sandbox.restore();
    if (clock) {
      clock.restore();
    }
  });

  it("should render with 3 headlines", () => {
    assert.ok(wrapper.exists());
    assert.lengthOf(wrapper.find(".briefing-card-headline"), 3);
  });

  it("should render headline with title, link, publisher, and icon", () => {
    const firstHeadline = wrapper.find(SafeAnchor).at(0);
    assert.equal(firstHeadline.prop("url"), "https://example.com/1");

    const title = firstHeadline.find(".briefing-card-headline-title");
    assert.equal(title.text(), "First Headline");

    const source = firstHeadline.find(".briefing-card-headline-source");
    assert.equal(source.text(), "Publisher One");

    const publisherIcon = firstHeadline.find(".briefing-card-headline-icon");
    assert.equal(publisherIcon.prop("src"), "https://example.com/icon1.png");
  });

  it("should dispatch BLOCK_URL and IMPRESSION_STATS on dismiss", () => {
    const store = createStore(combineReducers(reducers), INITIAL_STATE);
    sandbox.spy(store, "dispatch");

    wrapper = mount(
      <Provider store={store}>
        <BriefingCard {...DEFAULT_PROPS} />
      </Provider>
    );

    const dispatchCountBeforeDismiss = store.dispatch.callCount;
    wrapper.find("panel-item").simulate("click");

    assert.equal(store.dispatch.callCount, dispatchCountBeforeDismiss + 2);

    const blockAction = store.dispatch.getCall(
      dispatchCountBeforeDismiss
    ).firstArg;
    assert.equal(blockAction.type, at.BLOCK_URL);
    assert.lengthOf(blockAction.data, 3);
    assert.equal(blockAction.source, "DAILY_BRIEFING");
    assert.equal(blockAction.data[0].format, "daily-briefing");

    const impressionAction = store.dispatch.getCall(
      dispatchCountBeforeDismiss + 1
    ).firstArg;
    assert.equal(impressionAction.type, at.TELEMETRY_IMPRESSION_STATS);
    assert.equal(impressionAction.data.source, "DAILY_BRIEFING");
  });

  it("should hide card after dismiss", () => {
    assert.lengthOf(wrapper.find(".briefing-card"), 1);

    wrapper.find("panel-item").simulate("click");
    wrapper.update();

    assert.lengthOf(wrapper.find(".briefing-card"), 0);
  });

  it("should apply sectionClassNames to briefing card", () => {
    const card = wrapper.find(".briefing-card");
    assert.isTrue(card.hasClass("col-1-medium"));
  });

  describe("timestamp", () => {
    beforeEach(() => {
      clock = sandbox.useFakeTimers(
        new Date("2024-03-20T10:30:00.000Z").getTime()
      );
    });

    afterEach(() => {
      if (clock) {
        clock.restore();
        clock = null;
      }
    });

    it("should show timestamp within 15 minutes", () => {
      const lastUpdated = new Date("2024-03-20T10:20:00.000Z").getTime();
      wrapper = mount(
        <WrapWithProvider>
          <BriefingCard {...DEFAULT_PROPS} lastUpdated={lastUpdated} />
        </WrapWithProvider>
      );

      assert.lengthOf(wrapper.find(".briefing-card-timestamp"), 1);
    });

    it("should hide timestamp after 15 minutes", () => {
      const lastUpdated = new Date("2024-03-20T10:00:00.000Z").getTime();
      wrapper = mount(
        <WrapWithProvider>
          <BriefingCard {...DEFAULT_PROPS} lastUpdated={lastUpdated} />
        </WrapWithProvider>
      );

      assert.lengthOf(wrapper.find(".briefing-card-timestamp"), 0);
    });
  });
  describe("onLinkClick", () => {
    it("should dispatch DiscoveryStreamUserEvent on headline click", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <BriefingCard {...DEFAULT_PROPS} />
        </Provider>
      );

      const dispatchCountBeforeClick = store.dispatch.callCount;
      const firstHeadline = wrapper.find(SafeAnchor).at(0);
      firstHeadline.simulate("click");

      assert.equal(store.dispatch.callCount, dispatchCountBeforeClick + 2);

      const openLinkAction = store.dispatch.getCall(
        dispatchCountBeforeClick
      ).firstArg;
      assert.equal(openLinkAction.type, at.OPEN_LINK);

      const userEventAction = store.dispatch.getCall(
        dispatchCountBeforeClick + 1
      ).firstArg;
      assert.equal(userEventAction.type, at.DISCOVERY_STREAM_USER_EVENT);
      assert.equal(userEventAction.data.value.format, "daily-briefing");
    });
  });

  describe("ImpressionStats", () => {
    it("should render ImpressionStats component with correct props", () => {
      const impressionStats = wrapper.find(ImpressionStats);
      assert.lengthOf(impressionStats, 1);
      assert.equal(impressionStats.prop("source"), "DAILY_BRIEFING");
      assert.lengthOf(impressionStats.prop("rows"), 3);
    });

    it("should pass correct format to ImpressionStats rows", () => {
      const impressionStats = wrapper.find(ImpressionStats);
      const rows = impressionStats.prop("rows");

      rows.forEach(row => {
        assert.equal(row.format, "daily-briefing");
      });
    });
  });
});
