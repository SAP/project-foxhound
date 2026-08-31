import React from "react";
import { mount } from "enzyme";
import { LinkParagraph } from "content-src/components/LinkParagraph";

describe("LinkParagraph component", () => {
  let sandbox;
  let wrapper;
  let handleAction;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    handleAction = sandbox.stub();

    wrapper = mount(
      <LinkParagraph
        text_content={{
          text: {
            string_id: "test-string-id",
          },
          link_keys: ["privacy_policy"],
          font_styles: "legal",
        }}
        handleAction={handleAction}
      />
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render LinkParagraph component", () => {
    assert.ok(wrapper.exists());
  });

  it("should render copy with legal style if legal is passed to font_styles", () => {
    assert.strictEqual(wrapper.find(".legal-paragraph").length, 1);
  });

  it("should render one link when only one link id is passed", () => {
    assert.strictEqual(wrapper.find(".legal-paragraph a").length, 1);
  });

  it("should call handleAction method when link is clicked", () => {
    const linkEl = wrapper.find(".legal-paragraph a");
    linkEl.simulate("click");
    assert.calledOnce(handleAction);
  });

  it("should render two links if an additional link id is passed", () => {
    wrapper.setProps({
      text_content: {
        text: {
          string_id: "test-string-id",
        },
        link_keys: ["privacy_policy", "terms_of_use"],
        font_styles: "legal",
      },
    });
    assert.strictEqual(wrapper.find(".legal-paragraph a").length, 2);
  });

  it("should render no links when no link id is passed", () => {
    wrapper.setProps({
      text_content: { links: null },
    });
    assert.strictEqual(wrapper.find(".legal-paragraph a").length, 0);
  });

  it("should render copy even when no link id is passed", () => {
    wrapper.setProps({
      text_content: { links: null },
    });
    assert.ok(wrapper.find(".legal-paragraph"));
  });

  it("should not render LinkParagraph component if text is not passed", () => {
    wrapper.setProps({ text_content: { text: null } });
    assert.ok(wrapper.isEmptyRender());
  });

  it("should render copy in link style if no font style is passed", () => {
    wrapper.setProps({
      text_content: {
        text: {
          string_id: "test-string-id",
        },
        link_keys: ["learn_more"],
      },
    });
    assert.strictEqual(wrapper.find(".link-paragraph").length, 1);
  });

  it("should not render links if string_id is not provided", () => {
    wrapper.setProps({
      text_content: { text: { string_id: null } },
    });
    assert.strictEqual(wrapper.find(".link-paragraph a").length, 0);
  });

  describe("when text is an array of segments (embedded links)", () => {
    const arrayTextContent = {
      text: [
        "Read the release notes ",
        {
          raw: "here",
          href: "https://example.com/notes",
          where: "tabshifted",
        },
        ", or open ",
        {
          raw: "settings",
          link_key: "settings",
        },
        ".",
      ],
      textAlign: "start",
      fontSize: "0.8125em",
      marginBlock: "0",
    };

    beforeEach(() => {
      wrapper = mount(
        <LinkParagraph
          text_content={arrayTextContent}
          handleAction={handleAction}
        />
      );
    });

    it("should render plain string segments inside the paragraph", () => {
      const text = wrapper.find(".link-paragraph").text();
      assert.include(text, "Read the release notes");
      assert.include(text, ", or open");
    });

    it("should render href segments as text-link anchors with the segment href", () => {
      const hrefAnchors = wrapper.find(".link-paragraph a[href]");
      assert.lengthOf(hrefAnchors, 1);
      assert.strictEqual(hrefAnchors.prop("href"), "https://example.com/notes");
      assert.isTrue(hrefAnchors.hasClass("text-link"));
    });

    it("should render link_key segments as role=link anchors with no href", () => {
      const linkKeyAnchor = wrapper
        .find(".link-paragraph a")
        .filterWhere(node => node.prop("value") === "settings");
      assert.lengthOf(linkKeyAnchor, 1);
      assert.strictEqual(linkKeyAnchor.prop("role"), "link");
      assert.strictEqual(linkKeyAnchor.prop("tabIndex"), "0");
      assert.isUndefined(linkKeyAnchor.prop("href"));
    });

    it("should fall back to a localized span when a segment has neither href nor link_key", () => {
      wrapper.setProps({
        text_content: { text: [{ raw: "plain segment" }] },
      });
      const paragraph = wrapper.find(".link-paragraph");
      assert.strictEqual(paragraph.find("a").length, 0);
      assert.include(paragraph.text(), "plain segment");
    });

    it("should apply CONFIGURABLE_STYLES from text_content to the paragraph", () => {
      const style = wrapper.find(".link-paragraph").prop("style");
      assert.strictEqual(style.textAlign, "start");
      assert.strictEqual(style.fontSize, "0.8125em");
      assert.strictEqual(style.marginBlock, "0");
    });

    it("should ignore unsupported style props on text_content", () => {
      wrapper.setProps({
        text_content: {
          text: ["hello"],
          notAStyleProp: "purple",
        },
      });
      const style = wrapper.find(".link-paragraph").prop("style");
      assert.notProperty(style, "notAStyleProp");
    });

    it("should render the legal style when font_styles is legal and text is an array", () => {
      wrapper.setProps({
        text_content: { ...arrayTextContent, font_styles: "legal" },
      });
      assert.strictEqual(wrapper.find(".legal-paragraph").length, 1);
      assert.strictEqual(wrapper.find(".link-paragraph").length, 0);
    });

    it("should call handleAction when a link_key segment is clicked", () => {
      const linkKeyAnchor = wrapper
        .find(".link-paragraph a")
        .filterWhere(node => node.prop("value") === "settings");
      linkKeyAnchor.simulate("click");
      assert.calledOnce(handleAction);
    });

    it("should call handleAction when Enter is pressed on a link_key segment", () => {
      const linkKeyAnchor = wrapper
        .find(".link-paragraph a")
        .filterWhere(node => node.prop("value") === "settings");
      linkKeyAnchor.simulate("keypress", { key: "Enter", repeat: false });
      assert.calledOnce(handleAction);
    });

    it("should ignore repeat Enter keypresses on a link_key segment", () => {
      const linkKeyAnchor = wrapper
        .find(".link-paragraph a")
        .filterWhere(node => node.prop("value") === "settings");
      linkKeyAnchor.simulate("keypress", { key: "Enter", repeat: true });
      assert.notCalled(handleAction);
    });

    it("should dispatch the OPEN_URL action when an href segment is clicked", () => {
      const hrefAnchor = wrapper.find(".link-paragraph a[href]");
      const preventDefault = sandbox.stub();
      hrefAnchor.simulate("click", { preventDefault });
      assert.calledOnce(preventDefault);
      assert.calledOnce(handleAction);
      assert.deepEqual(handleAction.firstCall.args[1], {
        type: "OPEN_URL",
        data: {
          args: "https://example.com/notes",
          where: "tabshifted",
        },
      });
    });

    it('should default the OPEN_URL `where` to "tab" when the segment omits it', () => {
      wrapper.setProps({
        text_content: {
          text: [{ raw: "go", href: "https://example.com" }],
        },
      });
      const hrefAnchor = wrapper.find(".link-paragraph a[href]");
      hrefAnchor.simulate("click", { preventDefault() {} });
      const [, action] = handleAction.firstCall.args;
      assert.deepEqual(action, {
        type: "OPEN_URL",
        data: { args: "https://example.com", where: "tab" },
      });
    });
  });
});
