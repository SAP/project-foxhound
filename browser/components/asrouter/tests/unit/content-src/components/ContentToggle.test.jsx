/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

import React from "react";
import { shallow } from "enzyme";
import { ContentToggle } from "content-src/components/ContentToggle";

describe("ContentToggle component", () => {
  let onToggle;

  const TILE_DATA = {
    id: "page-content-toggle",
    label: "Include page content",
    visible: true,
  };

  const makeWrapper = (data = TILE_DATA, toggled = true) =>
    shallow(
      <ContentToggle
        content={{ tiles: { data } }}
        toggled={toggled}
        onToggle={onToggle}
      />
    );

  beforeEach(() => {
    onToggle = sinon.stub();
  });

  it("should render checkbox when visible is true", () => {
    const wrapper = makeWrapper();
    assert.ok(wrapper.find("input[type='checkbox']").exists());
  });

  it("should not render when visible is not set", () => {
    const wrapper = makeWrapper({ ...TILE_DATA, visible: false });
    assert.ok(!wrapper.find("input[type='checkbox']").exists());
  });

  it("should reflect toggled=true as checked", () => {
    const wrapper = makeWrapper();
    assert.ok(wrapper.find("input[type='checkbox']").prop("checked"));
  });

  it("should reflect toggled=false as unchecked", () => {
    const wrapper = makeWrapper(TILE_DATA, false);
    assert.ok(!wrapper.find("input[type='checkbox']").prop("checked"));
  });

  it("should call onToggle with false when unchecked", () => {
    const wrapper = makeWrapper();
    wrapper
      .find("input[type='checkbox']")
      .simulate("change", { target: { checked: false } });
    assert.calledOnceWithExactly(onToggle, false);
  });
});
