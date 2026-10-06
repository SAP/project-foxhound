import {
  _DiscoveryStreamBase as DiscoveryStreamBase,
  isAllowedCSS,
} from "content-src/components/DiscoveryStreamBase/DiscoveryStreamBase";
import { CollapsibleSection } from "content-src/components/CollapsibleSection/CollapsibleSection";
import { ExternalComponentWrapper } from "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper";
import { GlobalOverrider } from "test/unit/utils";
import { CardGrid } from "content-src/components/DiscoveryStreamComponents/CardGrid/CardGrid";
import { HorizontalRule } from "content-src/components/DiscoveryStreamComponents/HorizontalRule/HorizontalRule";
// eslint-disable-next-line no-shadow
import { Navigation } from "content-src/components/DiscoveryStreamComponents/Navigation/Navigation";
import React from "react";
import { shallow } from "enzyme";
import { SectionTitle } from "content-src/components/DiscoveryStreamComponents/SectionTitle/SectionTitle";
import { TopSites } from "content-src/components/TopSites/TopSites";

describe("<isAllowedCSS>", () => {
  it("should allow colors", () => {
    assert.isTrue(isAllowedCSS("color", "red"));
  });

  it("should allow chrome urls", () => {
    assert.isTrue(
      isAllowedCSS(
        "background-image",
        `url("chrome://global/skin/icons/info.svg")`
      )
    );
  });

  it("should allow chrome urls", () => {
    assert.isTrue(
      isAllowedCSS(
        "background-image",
        `url("chrome://browser/skin/history.svg")`
      )
    );
  });

  it("should allow allowed https urls", () => {
    assert.isTrue(
      isAllowedCSS(
        "background-image",
        `url("https://img-getpocket.cdn.mozilla.net/media/image.png")`
      )
    );
  });

  it("should disallow other https urls", () => {
    assert.isFalse(
      isAllowedCSS(
        "background-image",
        `url("https://mozilla.org/media/image.png")`
      )
    );
  });

  it("should disallow other protocols", () => {
    assert.isFalse(
      isAllowedCSS(
        "background-image",
        `url("ftp://mozilla.org/media/image.png")`
      )
    );
  });

  it("should allow allowed multiple valid urls", () => {
    assert.isTrue(
      isAllowedCSS(
        "background-image",
        `url("https://img-getpocket.cdn.mozilla.net/media/image.png"), url("chrome://browser/skin/history.svg")`
      )
    );
  });

  it("should disallow if any invaild", () => {
    assert.isFalse(
      isAllowedCSS(
        "background-image",
        `url("chrome://browser/skin/history.svg"), url("ftp://mozilla.org/media/image.png")`
      )
    );
  });
});

describe("<DiscoveryStreamBase>", () => {
  let wrapper;
  let globals;
  let sandbox;

  function mountComponent(props = {}) {
    const defaultProps = {
      layout: [],
      feeds: { loaded: true },
      spocs: {
        loaded: true,
        data: { spocs: null },
      },
      ...props,
    };
    return shallow(
      <DiscoveryStreamBase
        locale="en-US"
        DiscoveryStream={defaultProps}
        Prefs={{
          values: {
            "feeds.section.topstories": true,
            "feeds.system.topstories": true,
            "feeds.topsites": true,
          },
        }}
        App={{
          locale: "en-US",
        }}
        document={{
          documentElement: { lang: "en-US" },
        }}
        Sections={[
          {
            id: "topstories",
            learnMore: { link: {} },
            pref: {},
          },
        ]}
      />
    );
  }

  beforeEach(() => {
    globals = new GlobalOverrider();
    sandbox = sinon.createSandbox();
    wrapper = mountComponent();
  });

  afterEach(() => {
    sandbox.restore();
    globals.restore();
  });

  it("should render something if spocs are not loaded", () => {
    wrapper = mountComponent({
      spocs: { loaded: false, data: { spocs: null } },
    });

    assert.notEqual(wrapper.type(), null);
  });

  it("should render something if feeds are not loaded", () => {
    wrapper = mountComponent({ feeds: { loaded: false } });

    assert.notEqual(wrapper.type(), null);
  });

  it("should render nothing with no layout", () => {
    assert.ok(wrapper.exists());
    assert.isEmpty(wrapper.children());
  });

  it("should render a HorizontalRule component", () => {
    wrapper = mountComponent({
      layout: [{ components: [{ type: "HorizontalRule" }] }],
    });

    assert.equal(
      wrapper.find(".ds-column-grid div").children().at(0).type(),
      HorizontalRule
    );
  });

  it("should render a CardGrid component", () => {
    wrapper = mountComponent({
      layout: [{ components: [{ properties: {}, type: "CardGrid" }] }],
    });

    assert.equal(
      wrapper.find(".ds-column-grid div").children().at(0).type(),
      CardGrid
    );
  });

  it("should render a Navigation component", () => {
    wrapper = mountComponent({
      layout: [{ components: [{ properties: {}, type: "Navigation" }] }],
    });

    assert.equal(
      wrapper.find(".ds-column-grid div").children().at(0).type(),
      Navigation
    );
  });

  it("should render a SectionTitle component", () => {
    wrapper = mountComponent({
      layout: [{ components: [{ properties: {}, type: "SectionTitle" }] }],
    });

    assert.equal(
      wrapper.find(".ds-column-grid div").children().at(0).type(),
      SectionTitle
    );
  });

  it("should render TopSites", () => {
    wrapper = mountComponent({
      layout: [{ components: [{ properties: {}, type: "TopSites" }] }],
    });

    assert.equal(
      wrapper
        .find(".ds-column-grid div")
        .find(".ds-top-sites")
        .children()
        .at(0)
        .type(),
      TopSites
    );
  });

  describe("#onStyleMount", () => {
    let parseStub;

    beforeEach(() => {
      parseStub = sandbox.stub();
      globals.set("JSON", { parse: parseStub });
    });

    afterEach(() => {
      sandbox.restore();
      globals.restore();
    });

    it("should return if no style", () => {
      assert.isUndefined(wrapper.instance().onStyleMount());
      assert.notCalled(parseStub);
    });

    it("should insert rules", () => {
      const sheetStub = { insertRule: sandbox.stub(), cssRules: [{}] };
      parseStub.returns([
        [
          null,
          {
            ".ds-message": "margin-bottom: -20px",
          },
          null,
          null,
        ],
      ]);
      wrapper.instance().onStyleMount({ sheet: sheetStub, dataset: {} });

      assert.calledOnce(sheetStub.insertRule);
      assert.calledWithExactly(sheetStub.insertRule, "DUMMY#CSS.SELECTOR {}");
    });
  });
});

describe("<DiscoveryStreamBase> ASRouterNewTabMessage positions", () => {
  // Layout includes TopSites (extracted and rendered separately) plus a
  // HorizontalRule so that layoutRender is non-empty after extraction,
  // causing the CollapsibleSection (content feed) to render.
  const POSITION_TEST_LAYOUT = [
    { components: [{ properties: {}, type: "TopSites" }] },
    { components: [{ type: "HorizontalRule" }] },
  ];

  const BASE_PREFS = {
    "feeds.section.topstories": true,
    "feeds.system.topstories": true,
    "feeds.topsites": true,
    "widgets.system.enabled": true,
    "nova.enabled": false,
  };

  function mountForPositionTest(messagesProps, prefsOverrides = {}) {
    return shallow(
      <DiscoveryStreamBase
        locale="en-US"
        DiscoveryStream={{
          layout: POSITION_TEST_LAYOUT,
          feeds: { loaded: true },
          spocs: { loaded: true, data: { spocs: null } },
        }}
        Messages={messagesProps}
        Prefs={{ values: { ...BASE_PREFS, ...prefsOverrides } }}
        App={{ locale: "en-US" }}
        document={{ documentElement: { lang: "en-US" } }}
        Sections={[{ id: "topstories", learnMore: { link: {} }, pref: {} }]}
        dispatch={() => {}}
      />
    );
  }

  function makeMessages({ position, isVisible = true } = {}) {
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

  function findPositionIndices(wrapper) {
    const children = wrapper.children();
    const indices = {
      messageIdx: -1,
      topSitesIdx: -1,
      widgetsIdx: -1,
      contentFeedIdx: -1,
    };

    children.forEach((child, i) => {
      if (
        child
          .find(ExternalComponentWrapper)
          .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE").length
      ) {
        indices.messageIdx = i;
      }
      if (child.hasClass("ds-layout-topsites")) {
        indices.topSitesIdx = i;
      }
      if (child.hasClass("ds-layout-widgets")) {
        indices.widgetsIdx = i;
      }
      if (child.type() === CollapsibleSection) {
        indices.contentFeedIdx = i;
      }
    });

    return indices;
  }

  it("does not render ASRouterNewTabMessage when there is no message", () => {
    const wrapper = mountForPositionTest(null);
    assert.lengthOf(
      wrapper
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
      0
    );
  });

  it("does not render ASRouterNewTabMessage when isVisible is false", () => {
    const wrapper = mountForPositionTest(makeMessages({ isVisible: false }));
    assert.lengthOf(
      wrapper
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
      0
    );
  });

  it("renders exactly one ASRouterNewTabMessage for any configured position", () => {
    for (const position of [
      // ABOVE_TOPSITES is intentionally skipped, since for non-Nova, it's rendered
      // by Base.jsx, since it makes it easier for browser_asrouter_newtab_message
      // to test it that way.
      "ABOVE_WIDGETS",
      "ABOVE_CONTENT_FEED",
    ]) {
      const wrapper = mountForPositionTest(makeMessages({ position }));
      assert.lengthOf(
        wrapper
          .find(ExternalComponentWrapper)
          .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
        1,
        `expected exactly one message for position ${position}`
      );
    }
  });

  it("renders ASRouterNewTabMessage after TopSites and before Widgets for ABOVE_WIDGETS", () => {
    const wrapper = mountForPositionTest(
      makeMessages({ position: "ABOVE_WIDGETS" })
    );
    const { messageIdx, topSitesIdx, widgetsIdx } =
      findPositionIndices(wrapper);

    assert.isAbove(topSitesIdx, -1, "TopSites section should be present");
    assert.isAbove(widgetsIdx, -1, "Widgets section should be present");
    assert.isAbove(messageIdx, -1, "message should be present");
    assert.isAbove(
      messageIdx,
      topSitesIdx,
      "message should come after TopSites"
    );
    assert.isBelow(
      messageIdx,
      widgetsIdx,
      "message should come before Widgets"
    );
  });

  it("renders ASRouterNewTabMessage after Widgets and before the content feed for ABOVE_CONTENT_FEED", () => {
    const wrapper = mountForPositionTest(
      makeMessages({ position: "ABOVE_CONTENT_FEED" })
    );
    const { messageIdx, widgetsIdx, contentFeedIdx } =
      findPositionIndices(wrapper);

    assert.isAbove(widgetsIdx, -1, "Widgets section should be present");
    assert.isAbove(contentFeedIdx, -1, "content feed should be present");
    assert.isAbove(messageIdx, -1, "message should be present");
    assert.isAbove(messageIdx, widgetsIdx, "message should come after Widgets");
    assert.isBelow(
      messageIdx,
      contentFeedIdx,
      "message should come before the content feed"
    );
  });

  // @nova-cleanup(remove-conditional): Delete this test; it only exists to cover the !novaEnabled guard in DiscoveryStreamBase.
  // When Nova is enabled, Base.jsx is responsible for rendering the
  // ASRouterNewTabMessages, rather than DiscoveryStreamBase.
  it("does not render ASRouterNewTabMessage when Nova is enabled", () => {
    const wrapper = mountForPositionTest(
      makeMessages({ position: "ABOVE_TOPSITES" }),
      {
        "nova.enabled": true,
      }
    );
    assert.lengthOf(
      wrapper
        .find(ExternalComponentWrapper)
        .filterWhere(w => w.prop("type") === "ASROUTER_NEWTAB_MESSAGE"),
      0
    );
  });
});
