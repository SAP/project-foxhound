import {
  _DSCard as DSCard,
  readTimeFromWordCount,
  DSSource,
  DefaultMeta,
  PlaceholderDSCard,
} from "content-src/components/DiscoveryStreamComponents/DSCard/DSCard";
import {
  DSContextFooter,
  StatusMessage,
  SponsorLabel,
} from "content-src/components/DiscoveryStreamComponents/DSContextFooter/DSContextFooter";
import { actionCreators as ac } from "common/Actions.mjs";
import { DSLinkMenu } from "content-src/components/DiscoveryStreamComponents/DSLinkMenu/DSLinkMenu";
import { DSImage } from "content-src/components/DiscoveryStreamComponents/DSImage/DSImage";
import React from "react";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { SafeAnchor } from "content-src/components/DiscoveryStreamComponents/SafeAnchor/SafeAnchor";
import { shallow, mount } from "enzyme";
import { FluentOrText } from "content-src/components/FluentOrText/FluentOrText";
import { Provider } from "react-redux";
import { combineReducers, createStore } from "redux";

const DEFAULT_PROPS = {
  url: "about:robots",
  title: "title",
  raw_image_src: "https://picsum.photos/200",
  icon_src: "https://picsum.photos/200",
  App: {
    isForStartupCache: false,
  },
  DiscoveryStream: INITIAL_STATE.DiscoveryStream,
  Prefs: INITIAL_STATE.Prefs,
  fetchTimestamp: new Date("March 20, 2024 10:30:44").getTime(),
  firstVisibleTimestamp: new Date("March 21, 2024 10:11:12").getTime(),
};

describe("<DSCard>", () => {
  let wrapper;
  let sandbox;
  let dispatch;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    wrapper = shallow(<DSCard dispatch={dispatch} {...DEFAULT_PROPS} />);
    wrapper.setState({ isSeen: true });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render", () => {
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".ds-card"));
  });

  it("should render a SafeAnchor", () => {
    wrapper.setProps({ url: "https://foo.com" });

    assert.equal(wrapper.children().at(0).type(), SafeAnchor);
    assert.propertyVal(
      wrapper.children().at(0).props(),
      "url",
      "https://foo.com"
    );
  });

  it("should pass onLinkClick prop", () => {
    assert.propertyVal(
      wrapper.children().at(0).props(),
      "onLinkClick",
      wrapper.instance().onLinkClick
    );
  });

  it("should pass isSponsored=false when flightId is not provided", () => {
    assert.propertyVal(wrapper.children().at(0).props(), "isSponsored", false);
  });

  it("should pass isSponsored=true when flightId is provided", () => {
    wrapper.setProps({ flightId: "12345" });
    assert.propertyVal(wrapper.children().at(0).props(), "isSponsored", true);
  });

  it("should render DSLinkMenu", () => {
    // Note: <DSLinkMenu> component moved from a direct child element of `.ds-card`. See Bug 1893936
    const default_link_menu = wrapper.find(DSLinkMenu);
    assert.ok(default_link_menu.exists());
  });

  it("should start with no .active class", () => {
    assert.equal(wrapper.find(".active").length, 0);
  });

  it("should render badges for pocket, bookmark when not a spoc element ", () => {
    const store = createStore(combineReducers(reducers), INITIAL_STATE);

    wrapper = mount(
      <Provider store={store}>
        <DSCard context_type="bookmark" {...DEFAULT_PROPS} />
      </Provider>
    );

    const dsCardInstance = wrapper.find(DSCard).instance();
    dsCardInstance.setState({ isSeen: true });
    wrapper.update();

    const contextFooter = wrapper.find(DSContextFooter);
    assert.lengthOf(contextFooter.find(StatusMessage), 1);
  });

  it("should render Sponsored Context for a spoc element", () => {
    // eslint-disable-next-line no-shadow
    const context = "Sponsored by Foo";
    const store = createStore(combineReducers(reducers), INITIAL_STATE);
    wrapper = mount(
      <Provider store={store}>
        <DSCard context_type="bookmark" context={context} {...DEFAULT_PROPS} />
      </Provider>
    );

    const dsCardInstance = wrapper.find(DSCard).instance();
    dsCardInstance.setState({ isSeen: true });
    wrapper.update();

    const contextFooter = wrapper.find(DSContextFooter);

    assert.lengthOf(contextFooter.find(StatusMessage), 0);
    assert.equal(contextFooter.find(".story-sponsored-label").text(), context);
  });

  it("should render time to read", () => {
    const store = createStore(combineReducers(reducers), INITIAL_STATE);
    const discoveryStream = {
      ...INITIAL_STATE.DiscoveryStream,
      readTime: true,
    };
    wrapper = mount(
      <Provider store={store}>
        <DSCard
          time_to_read={4}
          {...DEFAULT_PROPS}
          DiscoveryStream={discoveryStream}
          Prefs={INITIAL_STATE.Prefs}
        />
      </Provider>
    );
    const dsCardInstance = wrapper.find(DSCard).instance();
    dsCardInstance.setState({ isSeen: true });
    wrapper.update();

    const defaultMeta = wrapper.find(DefaultMeta);
    assert.lengthOf(defaultMeta, 1);
    assert.equal(defaultMeta.props().timeToRead, 4);
  });

  describe("doesLinkTopicMatchSelectedTopic", () => {
    it("should return 'not-set' when selectedTopics is not set", () => {
      wrapper.setProps({
        id: "fooidx",
        pos: 1,
        type: "foo",
        topic: "bar",
        selectedTopics: "",
        availableTopics: "foo, bar, baz, qux",
      });
      const matchesSelectedTopic = wrapper
        .instance()
        .doesLinkTopicMatchSelectedTopic();
      assert.equal(matchesSelectedTopic, "not-set");
    });

    it("should return 'topic-not-selectable' when topic is not in availableTopics", () => {
      wrapper.setProps({
        id: "fooidx",
        pos: 1,
        type: "foo",
        topic: "qux",
        selectedTopics: "foo, bar, baz",
        availableTopics: "foo, bar, baz",
      });
      const matchesSelectedTopic = wrapper
        .instance()
        .doesLinkTopicMatchSelectedTopic();
      assert.equal(matchesSelectedTopic, "topic-not-selectable");
    });

    it("should return 'true' when topic is in selectedTopics", () => {
      wrapper.setProps({
        id: "fooidx",
        pos: 1,
        type: "foo",
        topic: "qux",
        selectedTopics: "foo, bar, baz, qux",
        availableTopics: "foo, bar, baz, qux",
      });
      const matchesSelectedTopic = wrapper
        .instance()
        .doesLinkTopicMatchSelectedTopic();
      assert.equal(matchesSelectedTopic, "true");
    });

    it("should return 'false' when topic is NOT in selectedTopics", () => {
      wrapper.setProps({
        id: "fooidx",
        pos: 1,
        type: "foo",
        topic: "qux",
        selectedTopics: "foo, bar, baz",
        availableTopics: "foo, bar, baz, qux",
      });
      const matchesSelectedTopic = wrapper
        .instance()
        .doesLinkTopicMatchSelectedTopic();
      assert.equal(matchesSelectedTopic, "false");
    });
  });

  describe("onLinkClick", () => {
    let fakeWindow;

    beforeEach(() => {
      fakeWindow = {
        requestIdleCallback: sinon.stub().returns(1),
        cancelIdleCallback: sinon.stub(),
        innerWidth: 1000,
        innerHeight: 900,
      };
      wrapper = shallow(
        <DSCard {...DEFAULT_PROPS} dispatch={dispatch} windowObj={fakeWindow} />
      );
    });

    it("should call dispatch with the correct events", () => {
      wrapper.setProps({ id: "fooidx", pos: 1, type: "foo" });

      sandbox
        .stub(wrapper.instance(), "doesLinkTopicMatchSelectedTopic")
        .returns(undefined);

      wrapper.instance().onLinkClick();

      assert.calledTwice(dispatch);
      assert.calledWith(
        dispatch,
        ac.DiscoveryStreamUserEvent({
          event: "CLICK",
          source: "FOO",
          action_position: 1,
          value: {
            event_source: "card",
            card_type: "organic",
            recommendation_id: undefined,
            tile_id: "fooidx",
            fetchTimestamp: DEFAULT_PROPS.fetchTimestamp,
            firstVisibleTimestamp: DEFAULT_PROPS.firstVisibleTimestamp,
            scheduled_corpus_item_id: undefined,
            corpus_item_id: undefined,
            recommended_at: undefined,
            received_rank: undefined,
            topic: undefined,
            features: undefined,
            matches_selected_topic: undefined,
            selected_topics: undefined,
            attribution: undefined,
            format: "medium-card",
          },
        })
      );
      assert.calledWith(
        dispatch,
        ac.ImpressionStats({
          click: 0,
          source: "FOO",
          tiles: [
            {
              id: "fooidx",
              pos: 1,
              type: "organic",
              recommendation_id: undefined,
              topic: undefined,
              selected_topics: undefined,
              format: "medium-card",
            },
          ],
          window_inner_width: 1000,
          window_inner_height: 900,
        })
      );
    });

    it("should set the right card_type on spocs", () => {
      wrapper.setProps({
        id: "fooidx",
        pos: 1,
        type: "foo",
        flightId: 12345,
        format: "spoc",
      });
      sandbox
        .stub(wrapper.instance(), "doesLinkTopicMatchSelectedTopic")
        .returns(undefined);
      wrapper.instance().onLinkClick();

      assert.calledTwice(dispatch);
      assert.calledWith(
        dispatch,
        ac.DiscoveryStreamUserEvent({
          event: "CLICK",
          source: "FOO",
          action_position: 1,
          value: {
            event_source: "card",
            card_type: "spoc",
            recommendation_id: undefined,
            tile_id: "fooidx",
            fetchTimestamp: DEFAULT_PROPS.fetchTimestamp,
            firstVisibleTimestamp: DEFAULT_PROPS.firstVisibleTimestamp,
            scheduled_corpus_item_id: undefined,
            corpus_item_id: undefined,
            recommended_at: undefined,
            received_rank: undefined,
            topic: undefined,
            features: undefined,
            matches_selected_topic: undefined,
            selected_topics: undefined,
            attribution: undefined,
            format: "spoc",
          },
        })
      );
      assert.calledWith(
        dispatch,
        ac.ImpressionStats({
          click: 0,
          source: "FOO",
          tiles: [
            {
              id: "fooidx",
              pos: 1,
              type: "spoc",
              recommendation_id: undefined,
              topic: undefined,
              selected_topics: undefined,
              format: "spoc",
            },
          ],
          window_inner_width: 1000,
          window_inner_height: 900,
        })
      );
    });

    it("should call dispatch with a shim", () => {
      wrapper.setProps({
        id: "fooidx",
        pos: 1,
        type: "foo",
        shim: {
          click: "click shim",
        },
      });

      sandbox
        .stub(wrapper.instance(), "doesLinkTopicMatchSelectedTopic")
        .returns(undefined);
      wrapper.instance().onLinkClick();

      assert.calledTwice(dispatch);
      assert.calledWith(
        dispatch,
        ac.DiscoveryStreamUserEvent({
          event: "CLICK",
          source: "FOO",
          action_position: 1,
          value: {
            event_source: "card",
            card_type: "organic",
            recommendation_id: undefined,
            tile_id: "fooidx",
            shim: "click shim",
            fetchTimestamp: DEFAULT_PROPS.fetchTimestamp,
            firstVisibleTimestamp: DEFAULT_PROPS.firstVisibleTimestamp,
            scheduled_corpus_item_id: undefined,
            corpus_item_id: undefined,
            recommended_at: undefined,
            received_rank: undefined,
            topic: undefined,
            features: undefined,
            matches_selected_topic: undefined,
            selected_topics: undefined,
            attribution: undefined,
            format: "medium-card",
          },
        })
      );
      assert.calledWith(
        dispatch,
        ac.ImpressionStats({
          click: 0,
          source: "FOO",
          tiles: [
            {
              id: "fooidx",
              pos: 1,
              shim: "click shim",
              type: "organic",
              recommendation_id: undefined,
              topic: undefined,
              selected_topics: undefined,
              format: "medium-card",
            },
          ],
          window_inner_width: 1000,
          window_inner_height: 900,
        })
      );
    });
  });

  describe("DSCard with CTA", () => {
    beforeEach(() => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      wrapper = mount(
        <Provider store={store}>
          <DSCard {...DEFAULT_PROPS} />
        </Provider>
      );
      const dsCardInstance = wrapper.find(DSCard).instance();
      dsCardInstance.setState({ isSeen: true });
      wrapper.update();
    });

    it("should render Default Meta", () => {
      const default_meta = wrapper.find(DefaultMeta);
      assert.ok(default_meta.exists());
    });
  });

  describe("DSCard with Intersection Observer", () => {
    beforeEach(() => {
      wrapper = shallow(<DSCard {...DEFAULT_PROPS} />);
    });

    it("should render card when seen", () => {
      let card = wrapper.find("div.ds-card.placeholder");
      assert.lengthOf(card, 1);

      wrapper.instance().observer = {
        unobserve: sandbox.stub(),
      };
      wrapper.instance().placeholderElement = "element";

      wrapper.instance().onSeen([
        {
          isIntersecting: true,
        },
      ]);

      assert.isTrue(wrapper.instance().state.isSeen);
      card = wrapper.find("div.ds-card.placeholder");
      assert.lengthOf(card, 0);
      assert.lengthOf(wrapper.find(SafeAnchor), 1);
      assert.calledOnce(wrapper.instance().observer.unobserve);
      assert.calledWith(wrapper.instance().observer.unobserve, "element");
    });

    it("should setup proper placeholder ref for isSeen", () => {
      wrapper.instance().setPlaceholderRef("element");
      assert.equal(wrapper.instance().placeholderElement, "element");
    });

    it("should setup observer on componentDidMount", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);

      wrapper = mount(
        <Provider store={store}>
          <DSCard {...DEFAULT_PROPS} />
        </Provider>
      );

      assert.isTrue(!!wrapper.find(DSCard).instance().observer);
    });
  });

  describe("DSCard with Idle Callback", () => {
    let windowStub = {
      requestIdleCallback: sinon.stub().returns(1),
      cancelIdleCallback: sinon.stub(),
    };
    beforeEach(() => {
      wrapper = shallow(<DSCard windowObj={windowStub} {...DEFAULT_PROPS} />);
    });

    it("should call requestIdleCallback on componentDidMount", () => {
      assert.calledOnce(windowStub.requestIdleCallback);
    });

    it("should call cancelIdleCallback on componentWillUnmount", () => {
      wrapper.instance().componentWillUnmount();
      assert.calledOnce(windowStub.cancelIdleCallback);
    });
  });

  describe("DSCard when rendered for about:home startup cache", () => {
    beforeEach(() => {
      const props = {
        App: {
          isForStartupCache: {
            App: true,
          },
        },
        DiscoveryStream: INITIAL_STATE.DiscoveryStream,
        Prefs: INITIAL_STATE.Prefs,
      };
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      wrapper = mount(
        <Provider store={store}>
          <DSCard {...props} />
        </Provider>
      );
    });

    it("should be set as isSeen automatically", () => {
      const dsCardInstance = wrapper.find(DSCard).instance();
      assert.isTrue(dsCardInstance.state.isSeen);
    });
  });

  describe("DSCard menu open states", () => {
    let cardNode;
    let fakeDocument;
    let fakeWindow;

    beforeEach(() => {
      fakeDocument = { l10n: { translateFragment: sinon.stub() } };
      fakeWindow = {
        document: fakeDocument,
        requestIdleCallback: sinon.stub().returns(1),
        cancelIdleCallback: sinon.stub(),
      };
      const store = createStore(combineReducers(reducers), INITIAL_STATE);

      wrapper = mount(
        <Provider store={store}>
          <DSCard {...DEFAULT_PROPS} windowObj={fakeWindow} />
        </Provider>
      );
      const dsCardInstance = wrapper.find(DSCard).instance();
      dsCardInstance.setState({ isSeen: true });
      wrapper.update();
      cardNode = wrapper.getDOMNode();
    });

    it("Should remove active on Menu Update", () => {
      // Add active class name to DSCard wrapper
      // to simulate menu open state
      cardNode.classList.add("active");
      assert.include(cardNode.className, "active");

      const dsCardInstance = wrapper.find(DSCard).instance();
      dsCardInstance.onMenuUpdate(false);
      wrapper.update();

      assert.notInclude(cardNode.className, "active");
    });

    it("Should add active on Menu Show", async () => {
      const dsCardInstance = wrapper.find(DSCard).instance();
      await dsCardInstance.onMenuShow();
      wrapper.update();
      assert.include(cardNode.className, "active");
    });

    it("Should add last-item to support resized window", async () => {
      fakeWindow.scrollMaxX = 20;
      const dsCardInstance = wrapper.find(DSCard).instance();
      await dsCardInstance.onMenuShow();
      wrapper.update();
      assert.include(cardNode.className, "last-item");
      assert.include(cardNode.className, "active");
    });

    it("should remove .active and .last-item classes", () => {
      const dsCardInstance = wrapper.find(DSCard).instance();

      const remove = sinon.stub();
      dsCardInstance.contextMenuButtonHostElement = {
        classList: { remove },
      };
      dsCardInstance.onMenuUpdate();
      assert.calledOnce(remove);
    });

    it("should add .active and .last-item classes", async () => {
      const dsCardInstance = wrapper.find(DSCard).instance();
      const add = sinon.stub();
      dsCardInstance.contextMenuButtonHostElement = {
        classList: { add },
      };
      await dsCardInstance.onMenuShow();
      assert.calledOnce(add);
    });
  });

  describe("DSCard standard sizes", () => {
    it("should render grid with correct image sizes", async () => {
      const standardImageSize = {
        mediaMatcher: "default",
        width: 296,
        height: 160,
      };
      const image = wrapper.find(DSImage);
      assert.deepEqual(image.props().sizes[0], standardImageSize);
    });
  });

  describe("DSCard medium rectangle format", () => {
    it("should pass an empty sizes array to the DSImage", async () => {
      wrapper.setProps({ format: "rectangle" });
      const image = wrapper.find(DSImage);
      assert.deepEqual(image.props().sizes, []);
    });
  });

  describe("OHTTP images", () => {
    function mountWithOptions({ prefs, props } = {}) {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      const prefsState = {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          "discoverystream.sections.enabled": true,
          "unifiedAds.ohttp.enabled": true,
          ohttpImagesConfig: { enabled: true, includeTopStoriesSection: false },
          "discoverystream.merino-provider.ohttp.enabled": true,
          "discoverystream.sections.contextualAds.enabled": true,
          "discoverystream.sections.personalization.inferred.user.enabled": true,
          "discoverystream.sections.personalization.inferred.enabled": true,
          "discoverystream.publisherFavicon.enabled": true,
          ...prefs,
        },
      };

      wrapper = mount(
        <Provider store={store}>
          <DSCard
            {...{
              ...DEFAULT_PROPS,
              sectionsCardImageSizes: {
                1: "medium",
                2: "medium",
                3: "medium",
                4: "medium",
              },
            }}
            {...props}
            Prefs={prefsState}
          />
        </Provider>
      );
      return wrapper;
    }

    function setWrapperIsSeen() {
      const dsCardInstance = wrapper.find(DSCard).instance();
      dsCardInstance.setState({ isSeen: true });
      wrapper.update();
    }

    it("should set secureImage and faviconSrc for Merino", async () => {
      wrapper = mountWithOptions();
      setWrapperIsSeen();

      const image = wrapper.find(DSImage);
      assert.deepEqual(image.at(0).props().secureImage, true);
      assert.deepEqual(image.at(1).props().secureImage, true);
      assert.deepEqual(image.at(2).props().secureImage, true);
      assert.deepEqual(image.at(3).props().secureImage, true);

      const defaultMeta = wrapper.find(DefaultMeta);
      assert.equal(
        defaultMeta.props().icon_src,
        `moz-cached-ohttp://newtab-image/?url=${encodeURIComponent(DEFAULT_PROPS.icon_src)}`
      );
    });

    it("should set secureImage for unified ads", async () => {
      wrapper = mountWithOptions({
        props: {
          flightId: "flightId",
        },
        prefs: {
          "unifiedAds.ohttp.enabled": false,
        },
      });
      setWrapperIsSeen();

      let image = wrapper.find(DSImage);
      assert.deepEqual(image.at(0).props().secureImage, false);
      assert.deepEqual(image.at(1).props().secureImage, false);
      assert.deepEqual(image.at(2).props().secureImage, false);
      assert.deepEqual(image.at(3).props().secureImage, false);

      wrapper = mountWithOptions({
        props: {
          flightId: "flightId",
        },
        prefs: {
          "unifiedAds.ohttp.enabled": true,
        },
      });
      setWrapperIsSeen();

      image = wrapper.find(DSImage);
      assert.deepEqual(image.at(0).props().secureImage, true);
      assert.deepEqual(image.at(1).props().secureImage, true);
      assert.deepEqual(image.at(2).props().secureImage, true);
      assert.deepEqual(image.at(3).props().secureImage, true);
    });

    it("should not set secureImage or icon_src for top stories", async () => {
      wrapper = mountWithOptions({
        props: {
          section: "top_stories_section",
        },
      });
      setWrapperIsSeen();

      let image = wrapper.find(DSImage);
      assert.deepEqual(image.at(0).props().secureImage, false);
      assert.deepEqual(image.at(1).props().secureImage, false);
      assert.deepEqual(image.at(2).props().secureImage, false);
      assert.deepEqual(image.at(3).props().secureImage, false);

      let defaultMeta = wrapper.find(DefaultMeta);
      assert.equal(defaultMeta.props().icon_src, DEFAULT_PROPS.icon_src);

      wrapper = mountWithOptions({
        props: {
          section: "top_stories_section",
        },
        prefs: {
          ohttpImagesConfig: { enabled: true, includeTopStoriesSection: true },
        },
      });
      setWrapperIsSeen();

      image = wrapper.find(DSImage);
      assert.deepEqual(image.at(0).props().secureImage, true);
      assert.deepEqual(image.at(1).props().secureImage, true);
      assert.deepEqual(image.at(2).props().secureImage, true);
      assert.deepEqual(image.at(3).props().secureImage, true);

      defaultMeta = wrapper.find(DefaultMeta);
      assert.equal(
        defaultMeta.props().icon_src,
        `moz-cached-ohttp://newtab-image/?url=${encodeURIComponent(DEFAULT_PROPS.icon_src)}`
      );
    });

    it("should not be seen on idle callback", async () => {
      wrapper = mountWithOptions();
      const dsCardInstance = wrapper.find(DSCard).instance();
      dsCardInstance.onIdleCallback();
      wrapper.update();
      assert.equal(dsCardInstance.state.isSeen, false);
    });
  });

  describe("DSCard section images sizes", () => {
    it("should render sections with correct image sizes", async () => {
      const cardSizes = {
        small: {
          width: 110,
          height: 117,
        },
        medium: {
          width: 300,
          height: 160,
        },
        large: {
          width: 190,
          height: 250,
        },
      };

      const mediaMatcher = {
        1: "default",
        2: "(min-width: 724px)",
        3: "(min-width: 1122px)",
        4: "(min-width: 1390px)",
      };

      wrapper.setProps({
        Prefs: {
          values: {
            "discoverystream.sections.enabled": true,
          },
        },
        sectionsCardImageSizes: {
          1: "medium",
          2: "large",
          3: "small",
          4: "large",
        },
      });
      const image = wrapper.find(DSImage);
      assert.lengthOf(image, 4);

      assert.equal(
        image.at(0).props().sizes[0].mediaMatcher,
        mediaMatcher["1"]
      );
      assert.equal(
        image.at(0).props().sizes[0].height,
        cardSizes.medium.height
      );
      assert.equal(image.at(0).props().sizes[0].width, cardSizes.medium.width);

      assert.equal(
        image.at(1).props().sizes[0].mediaMatcher,
        mediaMatcher["2"]
      );
      assert.equal(image.at(1).props().sizes[0].height, cardSizes.large.height);
      assert.equal(image.at(1).props().sizes[0].width, cardSizes.large.width);

      assert.deepEqual(
        image.at(2).props().sizes[0].mediaMatcher,
        mediaMatcher["3"]
      );
      assert.equal(image.at(2).props().sizes[0].height, cardSizes.small.height);
      assert.equal(image.at(2).props().sizes[0].width, cardSizes.small.width);

      assert.equal(
        image.at(3).props().sizes[0].mediaMatcher,
        mediaMatcher["4"]
      );
      assert.equal(image.at(3).props().sizes[0].height, cardSizes.large.height);
      assert.equal(image.at(3).props().sizes[0].width, cardSizes.large.width);
    });
  });

  it("should render topic label when isDailyBrief is true", () => {
    const store = createStore(combineReducers(reducers), INITIAL_STATE);
    wrapper = mount(
      <Provider store={store}>
        <DSCard {...DEFAULT_PROPS} isDailyBrief={true} topic="technology" />
      </Provider>
    );

    const dsCardInstance = wrapper.find(DSCard).instance();
    dsCardInstance.setState({ isSeen: true });
    wrapper.update();

    const topicLabel = wrapper.find(".ds-card-daily-brief-topic");
    assert.lengthOf(topicLabel, 1);
    assert.equal(
      topicLabel.prop("data-l10n-id"),
      "newtab-topic-label-technology"
    );
  });
});

describe("<PlaceholderDSCard> component", () => {
  it("should have placeholder prop", () => {
    const wrapper = shallow(<PlaceholderDSCard />);
    const placeholder = wrapper.prop("placeholder");
    assert.isTrue(placeholder);
  });

  it("should contain placeholder div", () => {
    const wrapper = shallow(<DSCard placeholder={true} {...DEFAULT_PROPS} />);
    wrapper.setState({ isSeen: true });
    const card = wrapper.find("div.ds-card.placeholder");
    assert.lengthOf(card, 1);
  });

  it("should not be clickable", () => {
    const wrapper = shallow(<DSCard placeholder={true} {...DEFAULT_PROPS} />);
    wrapper.setState({ isSeen: true });
    const anchor = wrapper.find("SafeAnchor.ds-card-link");
    assert.lengthOf(anchor, 0);
  });

  it("should not have context menu", () => {
    const wrapper = shallow(<DSCard placeholder={true} {...DEFAULT_PROPS} />);
    wrapper.setState({ isSeen: true });
    const linkMenu = wrapper.find(DSLinkMenu);
    assert.lengthOf(linkMenu, 0);
  });
});

describe("<DSSource> component", () => {
  it("should return a default source without compact", () => {
    const wrapper = shallow(<DSSource source="Mozilla" />);

    let sourceElement = wrapper.find(".source");
    assert.equal(sourceElement.text(), "Mozilla");
  });
  it("should return a default source with compact without a sponsor or time to read", () => {
    const wrapper = shallow(<DSSource compact={true} source="Mozilla" />);

    let sourceElement = wrapper.find(".source");
    assert.equal(sourceElement.text(), "Mozilla");
  });
  it("should return a SponsorLabel with compact and a sponsor", () => {
    const wrapper = shallow(
      <DSSource newSponsoredLabel={true} sponsor="Mozilla" />
    );
    const sponsorLabel = wrapper.find(SponsorLabel);
    assert.lengthOf(sponsorLabel, 1);
  });
  it("should return a time to read with compact and without a sponsor but with a time to read", () => {
    const wrapper = shallow(
      <DSSource compact={true} source="Mozilla" timeToRead="2000" />
    );

    let timeToRead = wrapper.find(".time-to-read");
    assert.lengthOf(timeToRead, 1);

    // Weirdly, we can test for the pressence of fluent, because time to read needs to be translated.
    // This is also because we did a shallow render, that th contents of fluent would be empty anyway.
    const fluentOrText = wrapper.find(FluentOrText);
    assert.lengthOf(fluentOrText, 1);
  });
  it("should prioritize a SponsorLabel if for some reason it gets everything", () => {
    const wrapper = shallow(
      <DSSource
        newSponsoredLabel={true}
        sponsor="Mozilla"
        source="Mozilla"
        timeToRead="2000"
      />
    );
    const sponsorLabel = wrapper.find(SponsorLabel);
    assert.lengthOf(sponsorLabel, 1);
  });
});

describe("readTimeFromWordCount function", () => {
  it("should return proper read time", () => {
    const result = readTimeFromWordCount(2000);
    assert.equal(result, 10);
  });
  it("should return false with falsey word count", () => {
    assert.isFalse(readTimeFromWordCount());
    assert.isFalse(readTimeFromWordCount(0));
    assert.isFalse(readTimeFromWordCount(""));
    assert.isFalse(readTimeFromWordCount(null));
    assert.isFalse(readTimeFromWordCount(undefined));
  });
  it("should return NaN with invalid word count", () => {
    assert.isNaN(readTimeFromWordCount("zero"));
    assert.isNaN(readTimeFromWordCount({}));
  });
});
