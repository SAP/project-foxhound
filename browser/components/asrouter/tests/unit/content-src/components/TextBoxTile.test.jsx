/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

import React from "react";
import { shallow } from "enzyme";
import { TextBoxTile } from "content-src/components/TextBoxTile";

describe("TextBoxTile component", () => {
  const TILE_DATA = {
    id: "chat-log-preview",
    content: '{"chat": "with page content"}',
    alternateContent: '{"chat": "without page content"}',
    style: { backgroundColor: "#F9F9FB" },
  };

  const makeWrapper = (data = TILE_DATA, contentToggled = true) =>
    shallow(
      <TextBoxTile
        content={{ tiles: { data } }}
        contentToggled={contentToggled}
      />
    );

  it("should show content when contentToggled is true", () => {
    const wrapper = makeWrapper();
    assert.equal(wrapper.find("div.textbox-input").text(), TILE_DATA.content);
  });

  it("should show alternateContent when contentToggled is false", () => {
    const wrapper = makeWrapper(TILE_DATA, false);
    assert.equal(
      wrapper.find("div.textbox-input").text(),
      TILE_DATA.alternateContent
    );
  });

  it("should show empty string when content is undefined", () => {
    const wrapper = makeWrapper({ ...TILE_DATA, content: undefined });
    assert.equal(wrapper.find("div.textbox-input").text(), "");
  });

  it("should apply styles from data.style", () => {
    const wrapper = makeWrapper();
    assert.equal(
      wrapper.find("div.textbox-input").prop("style").backgroundColor,
      TILE_DATA.style.backgroundColor
    );
  });

  it("should not apply styles when data.style is not set", () => {
    const wrapper = makeWrapper({ ...TILE_DATA, style: undefined });
    assert.equal(wrapper.find("div.textbox-input").prop("style"), null);
  });
});
