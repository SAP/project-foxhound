/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render, fireEvent } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import {
  actionTypes as at,
  CONTENT_MESSAGE_TYPE,
  MAIN_MESSAGE_TYPE,
} from "common/Actions.mjs";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { CardSections } from "content-src/components/DiscoveryStreamComponents/CardSections/CardSections";

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
            id: "card-1",
            title: "Card 1",
            image_src: "image1.jpg",
            url: "https://example.com",
          },
          { id: "card-2" },
          { id: "card-3" },
          { id: "card-4" },
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
                { size: "large", position: 0, hasAd: false, hasExcerpt: true },
                { size: "small", position: 2, hasAd: false, hasExcerpt: false },
                { size: "medium", position: 1, hasAd: true, hasExcerpt: true },
                { size: "small", position: 3, hasAd: false, hasExcerpt: false },
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

describe("<CardSections />", () => {
  let dispatch;

  beforeEach(() => {
    dispatch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render section wrapper when data is provided", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-section-wrapper")).toBeInTheDocument();
  });

  it("should render null when data is null", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} data={null} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".ds-section-wrapper")
    ).not.toBeInTheDocument();
  });

  it("should render DSEmptyState if sections are falsey", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections
          {...DEFAULT_PROPS}
          data={{ ...DEFAULT_PROPS.data, sections: [] }}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-card-grid.empty")).toBeInTheDocument();
  });

  it("should render sections and DSCard components for valid data", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    const { sections } = DEFAULT_PROPS.data;
    expect(container.querySelectorAll("section")).toHaveLength(sections.length);
    expect(container.querySelectorAll("article.ds-card")).toHaveLength(4);
    expect(container.querySelector(".section-title")).toHaveTextContent(
      "title"
    );
  });

  it("should skip a section with no items available for that section", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-section")).toBeInTheDocument();

    const { container: container2 } = render(
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
    expect(container2.querySelector(".ds-section")).not.toBeInTheDocument();
  });

  it("should render a placeholder", () => {
    const { container } = render(
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
    expect(container.querySelector(".ds-card.placeholder")).toBeInTheDocument();
  });

  it("should render DEFAULT_MAX_TILES placeholder cards when spocsLoading is true", () => {
    const sectionData = [];
    for (let i = 0; i < 12; i++) {
      sectionData.push({ id: `card-${i}`, url: `https://example.com/${i}` });
    }
    const sectionProps = {
      ...DEFAULT_PROPS,
      data: {
        ...DEFAULT_PROPS.data,
        sections: [
          {
            ...DEFAULT_PROPS.data.sections[0],
            sectionKey: "section_key_1",
            data: sectionData,
          },
          {
            ...DEFAULT_PROPS.data.sections[0],
            sectionKey: "section_key_2",
            data: sectionData,
          },
        ],
      },
    };

    const { container: baselineContainer } = render(
      <WrapWithProvider>
        <CardSections {...sectionProps} />
      </WrapWithProvider>
    );
    expect(baselineContainer.querySelectorAll("article.ds-card")).toHaveLength(
      8
    );

    const { container } = render(
      <WrapWithProvider>
        <CardSections {...sectionProps} spocsLoading={true} />
      </WrapWithProvider>
    );
    expect(container.querySelectorAll(".ds-card.placeholder")).toHaveLength(24);
  });

  it("should render placeholders when responsiveLayouts is empty", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections
          {...DEFAULT_PROPS}
          data={{
            ...DEFAULT_PROPS.data,
            sections: [
              {
                ...DEFAULT_PROPS.data.sections[0],
                layout: { responsiveLayouts: [] },
                data: [{ placeholder: true }, { placeholder: true }],
              },
            ],
          }}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelectorAll(".ds-card.placeholder").length
    ).toBeGreaterThan(0);
  });

  it("should pass correct props to DSCard", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    expect(container.querySelector("a.ds-card-link")).toHaveAttribute(
      "href",
      "https://example.com"
    );
    expect(container.querySelector(".ds-card .title")).toHaveTextContent(
      "Card 1"
    );
  });

  it("should apply correct classNames and position from layout data", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    const cards = container.querySelectorAll("article.ds-card");
    expect(cards[0]).toHaveClass(
      "col-1-large",
      "col-1-position-0",
      "col-1-show-excerpt"
    );
    expect(cards[2]).toHaveClass(
      "col-1-small",
      "col-1-position-1",
      "col-1-hide-excerpt"
    );
  });

  it("should apply correct class names for cards with and without excerpts", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    container.querySelectorAll("article.ds-card").forEach(card => {
      const classNames = card.className;
      if (classNames.includes("small") || classNames.includes("medium")) {
        expect(classNames).toContain("hide-excerpt");
        expect(classNames).not.toContain("show-excerpt");
      } else {
        expect(classNames).toContain("show-excerpt");
        expect(classNames).not.toContain("hide-excerpt");
      }
    });
  });

  it("should dispatch SECTION_PERSONALIZATION_UPDATE updates with follow and unfollow", () => {
    const fakeDate = "2020-01-01T00:00:00.000Z";
    jest.useFakeTimers({ now: new Date(fakeDate) });

    const layout = {
      title: "layout_name",
      responsiveLayouts: [
        {
          columnCount: 1,
          tiles: [
            { size: "large", position: 0, hasAd: false, hasExcerpt: true },
            { size: "small", position: 2, hasAd: false, hasExcerpt: false },
            { size: "medium", position: 1, hasAd: true, hasExcerpt: true },
            { size: "small", position: 3, hasAd: false, hasExcerpt: false },
          ],
        },
      ],
    };

    const state = {
      ...INITIAL_STATE,
      DiscoveryStream: {
        ...INITIAL_STATE.DiscoveryStream,
        sectionPersonalization: {
          section_key_2: { isFollowed: true, isBlocked: false },
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

    const { container } = render(
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
                    url: "https://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_1",
                title: "title",
                followable: true,
                layout,
              },
              {
                data: [
                  {
                    title: "Card 2",
                    image_src: "image2.jpg",
                    url: "https://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_2",
                title: "title",
                followable: true,
                layout,
              },
            ],
          }}
        />
      </WrapWithProvider>
    );

    fireEvent.click(container.querySelector(".section-follow moz-button"));

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: at.SECTION_PERSONALIZATION_SET,
      data: {
        section_key_2: { isFollowed: true, isBlocked: false },
        section_key_1: {
          isFollowed: true,
          isBlocked: false,
          followedAt: fakeDate,
        },
      },
      meta: { from: CONTENT_MESSAGE_TYPE, to: MAIN_MESSAGE_TYPE },
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: at.FOLLOW_SECTION,
      data: {
        section: "section_key_1",
        section_position: 0,
        event_source: "MOZ_BUTTON",
      },
      meta: {
        from: CONTENT_MESSAGE_TYPE,
        to: MAIN_MESSAGE_TYPE,
        skipLocal: true,
      },
    });

    expect(dispatch).toHaveBeenNthCalledWith(3, {
      type: at.SHOW_TOAST_MESSAGE,
      data: {
        toastId: "followSectionToast",
        showNotifications: true,
        toastData: { l10nId: "newtab-section-toast-follow", topic: "title" },
      },
      meta: {
        from: MAIN_MESSAGE_TYPE,
        skipMain: true,
        to: "ActivityStream:Content",
        toTarget: "ActivityStream:Content",
      },
    });

    fireEvent.click(
      container.querySelector(".section-follow.following moz-button")
    );

    expect(dispatch).toHaveBeenNthCalledWith(4, {
      type: at.SECTION_PERSONALIZATION_SET,
      data: {},
      meta: { from: CONTENT_MESSAGE_TYPE, to: MAIN_MESSAGE_TYPE },
    });
    expect(dispatch).toHaveBeenNthCalledWith(5, {
      type: at.UNFOLLOW_SECTION,
      data: {
        section: "section_key_2",
        section_position: 1,
        event_source: "MOZ_BUTTON",
      },
      meta: {
        from: CONTENT_MESSAGE_TYPE,
        to: MAIN_MESSAGE_TYPE,
        skipLocal: true,
      },
    });
    expect(dispatch).toHaveBeenNthCalledWith(6, {
      type: at.SHOW_TOAST_MESSAGE,
      data: {
        toastId: "unfollowSectionToast",
        showNotifications: true,
        toastData: { l10nId: "newtab-section-toast-unfollow", topic: "title" },
      },
      meta: {
        from: MAIN_MESSAGE_TYPE,
        skipMain: true,
        to: "ActivityStream:Content",
        toTarget: "ActivityStream:Content",
      },
    });
  });

  it("should render <FollowSectionButtonHighlight> when conditions match", () => {
    const state = {
      ...INITIAL_STATE,
      DiscoveryStream: {
        ...INITIAL_STATE.DiscoveryStream,
        sectionPersonalization: {},
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
        messageData: {
          content: { messageType: "FollowSectionButtonHighlight" },
        },
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

    const { container } = render(
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
                    url: "https://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_1",
                title: "title",
                followable: true,
                layout,
              },
              {
                data: [
                  {
                    title: "Card 2",
                    image_src: "image2.jpg",
                    url: "https://example.com",
                  },
                ],
                receivedRank: 0,
                sectionKey: "section_key_2",
                title: "title",
                followable: true,
                layout,
              },
            ],
          }}
        />
      </WrapWithProvider>
    );

    expect(
      container.querySelectorAll(".follow-section-button-highlight")
    ).toHaveLength(1);
  });

  describe("Keyboard navigation", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });
    });

    it("should pass tabIndex={0} to the first card and tabIndex={-1} to other cards", () => {
      const { container } = render(
        <WrapWithProvider>
          <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
        </WrapWithProvider>
      );
      const links = container.querySelectorAll("a.ds-card-link");
      expect(links[0]).toHaveAttribute("tabindex", "0");
      expect(links[1]).toHaveAttribute("tabindex", "-1");
      expect(links[2]).toHaveAttribute("tabindex", "-1");
    });

    it("should update focused index when onFocus is called", () => {
      const { container } = render(
        <WrapWithProvider>
          <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
        </WrapWithProvider>
      );
      const links = container.querySelectorAll("a.ds-card-link");
      fireEvent.focus(links[1]);
      expect(links[1]).toHaveAttribute("tabindex", "0");
      expect(links[0]).toHaveAttribute("tabindex", "-1");
    });

    describe("handleCardKeyDown", () => {
      it("should navigate to next card with ArrowRight", () => {
        const { container } = render(
          <WrapWithProvider>
            <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
          </WrapWithProvider>
        );
        const firstCardLink = container.querySelector(
          "article.ds-card.col-1-position-0 a.ds-card-link"
        );
        const nextCardLink = container.querySelector(
          "article.ds-card.col-1-position-1 a.ds-card-link"
        );
        const focusSpy = jest.spyOn(nextCardLink, "focus");
        fireEvent.keyDown(firstCardLink, { key: "ArrowRight" });
        expect(focusSpy).toHaveBeenCalled();
      });

      it("should navigate to previous card with ArrowLeft", () => {
        const { container } = render(
          <WrapWithProvider>
            <CardSections dispatch={dispatch} {...DEFAULT_PROPS} />
          </WrapWithProvider>
        );
        const secondCardLink = container.querySelector(
          "article.ds-card.col-1-position-1 a.ds-card-link"
        );
        const firstCardLink = container.querySelector(
          "article.ds-card.col-1-position-0 a.ds-card-link"
        );
        const focusSpy = jest.spyOn(firstCardLink, "focus");
        fireEvent.keyDown(secondCardLink, { key: "ArrowLeft" });
        expect(focusSpy).toHaveBeenCalled();
      });
    });
  });

  describe("Daily Briefing v2 BriefingCard", () => {
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

    let state;

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
      const { container } = render(
        <WrapWithProvider state={state}>
          <CardSections dispatch={dispatch} {...createBriefingSectionProps()} />
        </WrapWithProvider>
      );
      expect(container.querySelector(".briefing-card")).toBeInTheDocument();
      expect(
        container.querySelectorAll(".briefing-card-headline")
      ).toHaveLength(3);
    });

    it("should not render BriefingCard when fewer than 3 headlines available", () => {
      state.DiscoveryStream.feeds.data[
        "https://merino.services.mozilla.com/api/v1/curated-recommendations"
      ].data.recommendations = MOCK_HEADLINES.slice(0, 2);

      const { container } = render(
        <WrapWithProvider state={state}>
          <CardSections dispatch={dispatch} {...createBriefingSectionProps()} />
        </WrapWithProvider>
      );
      expect(container.querySelector(".briefing-card")).not.toBeInTheDocument();
      expect(container.querySelector("article.ds-card")).toBeInTheDocument();
    });

    it("should not render BriefingCard when section key doesn't match", () => {
      const { container } = render(
        <WrapWithProvider state={state}>
          <CardSections
            dispatch={dispatch}
            {...createBriefingSectionProps({ sectionKey: "other-section" })}
          />
        </WrapWithProvider>
      );
      expect(container.querySelector(".briefing-card")).not.toBeInTheDocument();
    });
  });
});
