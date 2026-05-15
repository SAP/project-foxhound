import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { CardSections } from "content-src/components/DiscoveryStreamComponents/CardSections/CardSections";
import { combineReducers, createStore } from "redux";
import { DSCard } from "../../../../../content-src/components/DiscoveryStreamComponents/DSCard/DSCard";
import { FollowSectionButtonHighlight } from "../../../../../content-src/components/DiscoveryStreamComponents/FeatureHighlight/FollowSectionButtonHighlight";
import { BriefingCard } from "../../../../../content-src/components/DiscoveryStreamComponents/BriefingCard/BriefingCard";

const PREF_SECTIONS_PERSONALIZATION_ENABLED =
  "discoverystream.sections.personalization.enabled";

const DEFAULT_PROPS = {
  type: "CardGrid",
  firstVisibleTimeStamp: null,
  ctaButtonSponsors: [""],
  anySectionsFollowed: false,
  data: {
    sections: [
      {
        data: [
          {
            title: "Card 1",
            image_src: "image1.jpg",
            url: "http://example.com",
          },
          {},
          {},
          {},
        ],
        receivedRank: 0,
        sectionKey: "section_key",
        title: "title",
        layout: {
          title: "layout_name",
          responsiveLayouts: [
            {
              columnCount: 1,
              tiles: [
                {
                  size: "large",
                  position: 0,
                  hasAd: false,
                  hasExcerpt: true,
                },
                {
                  size: "small",
                  position: 2,
                  hasAd: false,
                  hasExcerpt: false,
                },
                {
                  size: "medium",
                  position: 1,
                  hasAd: true,
                  hasExcerpt: true,
                },
                {
                  size: "small",
                  position: 3,
                  hasAd: false,
                  hasExcerpt: false,
                },
              ],
            },
          ],
        },
      },
    ],
  },
  feed: {
    embed_reference: null,
    url: "https://merino.services.mozilla.com/api/v1/curated-recommendations",
  },
};

// Wrap this around any component that uses useSelector,
// or any mount that uses a child that uses redux.
function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<CardSections />", () => {
  let wrapper;
  let sandbox;
  let dispatch;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    wrapper = mount(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render null if no data is provided", () => {
    // Verify the section exists normally, so the next assertion is unlikely to be a false positive.
    assert(wrapper.find(".ds-section-wrapper").exists());

    wrapper = mount(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} data={null} />
      </WrapWithProvider>
    );
    assert(!wrapper.find(".ds-section-wrapper").exists());
  });

  it("should render DSEmptyState if sections are falsey", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CardSections
          {...DEFAULT_PROPS}
          data={{ ...DEFAULT_PROPS.data, sections: [] }}
        />
      </WrapWithProvider>
    );
    assert(wrapper.find(".ds-card-grid.empty").exists());
  });

  it("should render sections and DSCard components for valid data", () => {
    const { sections } = DEFAULT_PROPS.data;
    const sectionLength = sections.length;
    assert.lengthOf(wrapper.find("section"), sectionLength);
    assert.lengthOf(wrapper.find(DSCard), 4);
    assert.equal(wrapper.find(".section-title").text(), "title");
  });

  it("should skip a section with no items available for that section", () => {
    // Verify the section exists normally, so the next assertion is unlikely to be a false positive.
    assert(wrapper.find(".ds-section").exists());

    wrapper = mount(
      <WrapWithProvider>
        <CardSections
          {...DEFAULT_PROPS}
          data={{
            ...DEFAULT_PROPS.data,
            sections: [{ ...DEFAULT_PROPS.data.sections[0], data: [] }],
          }}
        />
      </WrapWithProvider>
    );
    assert(!wrapper.find(".ds-section").exists());
  });

  it("should render a placeholder", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CardSections
          {...DEFAULT_PROPS}
          data={{
            ...DEFAULT_PROPS.data,
            sections: [
              {
                ...DEFAULT_PROPS.data.sections[0],
                data: [{ placeholder: true }],
              },
            ],
          }}
        />
      </WrapWithProvider>
    );
    assert(wrapper.find(".ds-card.placeholder").exists());
  });

  it("should pass correct props to DSCard", () => {
    const cardProps = wrapper.find(DSCard).at(0).props();
    assert.equal(cardProps.title, "Card 1");
    assert.equal(cardProps.image_src, "image1.jpg");
    assert.equal(cardProps.url, "http://example.com");
  });

  it("should apply correct classNames and position from layout data", () => {
    const props = wrapper.find(DSCard).at(0).props();
    const thirdProps = wrapper.find(DSCard).at(2).props();
    assert.equal(
      props.sectionsClassNames,
      "col-1-large col-1-position-0 col-1-show-excerpt"
    );
    assert.equal(
      thirdProps.sectionsClassNames,
      "col-1-small col-1-position-1 col-1-hide-excerpt"
    );
  });

  it("should apply correct class names for cards with and without excerpts", () => {
    wrapper.find(DSCard).forEach(card => {
      const props = card.props();
      const classNames = props.sectionsClassNames;
      if (classNames.includes("small") || classNames.includes("medium")) {
        assert.include(props.sectionsClassNames, "hide-excerpt");
        assert.notInclude(props.sectionsClassNames, "show-excerpt");
      }
      // The other cards should show excerpts though!
      else {
        assert.include(props.sectionsClassNames, "show-excerpt");
        assert.notInclude(props.sectionsClassNames, "hide-excerpt");
      }
    });
  });

  it("should dispatch SECTION_PERSONALIZATION_UPDATE updates with follow and unfollow", () => {
    const fakeDate = "2020-01-01T00:00:00.000Z";
    sandbox.useFakeTimers(new Date(fakeDate));
    const layout = {
      title: "layout_name",
      responsiveLayouts: [
        {
          columnCount: 1,
          tiles: [
            {
              size: "large",
              position: 0,
              hasAd: false,
              hasExcerpt: true,
            },
            {
              size: "small",
              position: 2,
              hasAd: false,
              hasExcerpt: false,
            },
            {
              size: "medium",
              position: 1,
              hasAd: true,
              hasExcerpt: true,
            },
            {
              size: "small",
              position: 3,
              hasAd: false,
              hasExcerpt: false,
            },
          ],
        },
      ],
    };
    // mock the pref for followed section
    const state = {
      ...INITIAL_STATE,
      DiscoveryStream: {
        ...INITIAL_STATE.DiscoveryStream,
        sectionPersonalization: {
          section_key_2: {
            isFollowed: true,
            isBlocked: false,
          },
        },
      },
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          [PREF_SECTIONS_PERSONALIZATION_ENABLED]: true,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={state}>
        <CardSections
          dispatch={dispatch}
          {...DEFAULT_PROPS}
          data={{
            ...DEFAULT_PROPS.data,
            sections: [
              {
                data: [
                  {
                    title: "Card 1",
                    image_src: "image1.jpg",
                    url: "http://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_1",
                title: "title",
                layout,
              },
              {
                data: [
                  {
                    title: "Card 2",
                    image_src: "image2.jpg",
                    url: "http://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_2",
                title: "title",
                layout,
              },
            ],
          }}
        />
      </WrapWithProvider>
    );

    let button = wrapper.find(".section-follow moz-button").first();
    button.simulate("click", {});

    assert.deepEqual(dispatch.getCall(0).firstArg, {
      type: "SECTION_PERSONALIZATION_SET",
      data: {
        section_key_2: {
          isFollowed: true,
          isBlocked: false,
        },
        section_key_1: {
          isFollowed: true,
          isBlocked: false,
          followedAt: fakeDate,
        },
      },
      meta: {
        from: "ActivityStream:Content",
        to: "ActivityStream:Main",
      },
    });

    assert.calledWith(dispatch.getCall(1), {
      type: "FOLLOW_SECTION",
      data: {
        section: "section_key_1",
        section_position: 0,
        event_source: "MOZ_BUTTON",
      },
      meta: {
        from: "ActivityStream:Content",
        to: "ActivityStream:Main",
        skipLocal: true,
      },
    });

    button = wrapper.find(".section-follow.following moz-button");
    button.simulate("click", {});

    assert.calledWith(dispatch.getCall(2), {
      type: "SECTION_PERSONALIZATION_SET",
      data: {},
      meta: {
        from: "ActivityStream:Content",
        to: "ActivityStream:Main",
      },
    });

    assert.calledWith(dispatch.getCall(3), {
      type: "UNFOLLOW_SECTION",
      data: {
        section: "section_key_2",
        section_position: 1,
        event_source: "MOZ_BUTTON",
      },
      meta: {
        from: "ActivityStream:Content",
        to: "ActivityStream:Main",
        skipLocal: true,
      },
    });
  });

  it("should render <FollowSectionButtonHighlight> when conditions match", () => {
    const fakeMessageData = {
      content: {
        messageType: "FollowSectionButtonHighlight",
      },
    };

    const layout = {
      title: "layout_name",
      responsiveLayouts: [
        {
          columnCount: 1,
          tiles: [{ size: "large", position: 0, hasExcerpt: true }],
        },
      ],
    };

    const state = {
      ...INITIAL_STATE,
      DiscoveryStream: {
        ...INITIAL_STATE.DiscoveryStream,
        sectionPersonalization: {}, // no sections followed
      },
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          [PREF_SECTIONS_PERSONALIZATION_ENABLED]: true,
        },
      },
      Messages: {
        isVisible: true,
        messageData: fakeMessageData,
      },
    };

    wrapper = mount(
      <WrapWithProvider state={state}>
        <CardSections
          dispatch={dispatch}
          {...DEFAULT_PROPS}
          data={{
            ...DEFAULT_PROPS.data,
            sections: [
              {
                data: [
                  {
                    title: "Card 1",
                    image_src: "image1.jpg",
                    url: "http://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_1",
                title: "title",
                layout,
              },
              {
                data: [
                  {
                    title: "Card 2",
                    image_src: "image2.jpg",
                    url: "http://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_2",
                title: "title",
                layout,
              },
            ],
          }}
        />
      </WrapWithProvider>
    );

    // Should only render for the second section (index 1)
    const highlight = wrapper.find(FollowSectionButtonHighlight);
    assert.equal(highlight.length, 1);
    assert.isTrue(wrapper.html().includes("follow-section-button-highlight"));
  });

  describe("Keyboard navigation", () => {
    beforeEach(() => {
      // Mock window.innerWidth to return a value that will make getActiveColumnLayout return "col-1"
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });
    });

    it("should pass tabIndex={0} to the first card and tabIndex={-1} to other cards", () => {
      const firstCard = wrapper.find(DSCard).at(0);
      const secondCard = wrapper.find(DSCard).at(1);
      const thirdCard = wrapper.find(DSCard).at(2);

      assert.equal(firstCard.prop("tabIndex"), 0);
      assert.equal(secondCard.prop("tabIndex"), -1);
      assert.equal(thirdCard.prop("tabIndex"), -1);
    });

    it("should update focused index when onFocus is called", () => {
      const secondCard = wrapper.find(DSCard).at(1);
      const onFocus = secondCard.prop("onFocus");

      onFocus();
      wrapper.update();

      assert.equal(wrapper.find(DSCard).at(1).prop("tabIndex"), 0);
      assert.equal(wrapper.find(DSCard).at(0).prop("tabIndex"), -1);
    });

    describe("handleCardKeyDown", () => {
      let grid;
      let mockLink;
      let mockTargetCard;
      let mockGridElement;
      let mockCurrentCard;
      let mockEvent;

      beforeEach(() => {
        grid = wrapper.find(".ds-section-grid.ds-card-grid");
        mockLink = { focus: sandbox.spy() };
        mockTargetCard = {
          querySelector: sandbox.stub().returns(mockLink),
        };
        mockGridElement = {
          querySelector: sandbox.stub().returns(mockTargetCard),
        };
        mockCurrentCard = {
          parentElement: mockGridElement,
        };
        mockEvent = {
          preventDefault: sandbox.spy(),
          target: {
            closest: sandbox.stub().returns(mockCurrentCard),
          },
        };
      });

      afterEach(() => {
        sandbox.restore();
      });

      it("should navigate to next card with ArrowRight", () => {
        mockEvent.key = "ArrowRight";
        mockCurrentCard.classList = ["col-1-position-0"];

        grid.prop("onKeyDown")(mockEvent);

        assert.calledOnce(mockEvent.preventDefault);
        assert.calledWith(
          mockGridElement.querySelector,
          "article.ds-card.col-1-position-1"
        );
        assert.calledOnce(mockLink.focus);
      });

      it("should navigate to previous card with ArrowLeft", () => {
        mockEvent.key = "ArrowLeft";
        mockCurrentCard.classList = ["col-1-position-1"];

        grid.prop("onKeyDown")(mockEvent);

        assert.calledOnce(mockEvent.preventDefault);
        assert.calledWith(
          mockGridElement.querySelector,
          "article.ds-card.col-1-position-0"
        );
        assert.calledOnce(mockLink.focus);
      });
    });
  });

  describe("Daily Briefing v2 BriefingCard", () => {
    let state;

    const MOCK_HEADLINES = [
      {
        id: "h1",
        section: "daily_brief_section",
        isHeadline: true,
        url: "https://example.com/1",
        title: "Headline 1",
        publisher: "Publisher 1",
      },
      {
        id: "h2",
        section: "daily_brief_section",
        isHeadline: true,
        url: "https://example.com/2",
        title: "Headline 2",
        publisher: "Publisher 2",
      },
      {
        id: "h3",
        section: "daily_brief_section",
        isHeadline: true,
        url: "https://example.com/3",
        title: "Headline 3",
        publisher: "Publisher 3",
      },
    ];

    const createBriefingSectionProps = ({
      sectionKey = "daily_brief_section",
      allowsWidget = true,
    } = {}) => ({
      ...DEFAULT_PROPS,
      data: {
        sections: [
          {
            ...DEFAULT_PROPS.data.sections[0],
            sectionKey,
            layout: {
              responsiveLayouts: [
                {
                  columnCount: 1,
                  tiles: [{ position: 0, size: "medium", allowsWidget }],
                },
              ],
            },
          },
        ],
      },
    });

    beforeEach(() => {
      state = {
        ...INITIAL_STATE,
        DiscoveryStream: {
          ...INITIAL_STATE.DiscoveryStream,
          feeds: {
            data: {
              "https://merino.services.mozilla.com/api/v1/curated-recommendations":
                {
                  data: {
                    recommendations: [
                      ...MOCK_HEADLINES,
                      { id: "r1", isHeadline: false },
                    ],
                  },
                  lastUpdated: Date.now(),
                },
            },
          },
        },
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            "discoverystream.dailyBrief.enabled": true,
            "discoverystream.dailyBrief.sectionId": "daily_brief_section",
          },
        },
      };
    });

    it("should render BriefingCard when all conditions met", () => {
      const props = createBriefingSectionProps();

      wrapper = mount(
        <WrapWithProvider state={state}>
          <CardSections dispatch={dispatch} {...props} />
        </WrapWithProvider>
      );

      const briefingCard = wrapper.find(BriefingCard);
      assert.lengthOf(briefingCard, 1);
      assert.lengthOf(briefingCard.prop("headlines"), 3);
      assert.isNumber(briefingCard.prop("lastUpdated"));
    });

    it("should not render BriefingCard when fewer than 3 headlines available", () => {
      state.DiscoveryStream.feeds.data[
        "https://merino.services.mozilla.com/api/v1/curated-recommendations"
      ].data.recommendations = MOCK_HEADLINES.slice(0, 2);

      const props = createBriefingSectionProps();

      wrapper = mount(
        <WrapWithProvider state={state}>
          <CardSections dispatch={dispatch} {...props} />
        </WrapWithProvider>
      );

      assert.lengthOf(wrapper.find(BriefingCard), 0);
      assert.isAtLeast(wrapper.find(DSCard).length, 1);
    });

    it("should not render BriefingCard when section key doesn't match", () => {
      const props = createBriefingSectionProps({ sectionKey: "other-section" });

      wrapper = mount(
        <WrapWithProvider state={state}>
          <CardSections dispatch={dispatch} {...props} />
        </WrapWithProvider>
      );

      assert.lengthOf(wrapper.find(BriefingCard), 0);
    });
  });
});
