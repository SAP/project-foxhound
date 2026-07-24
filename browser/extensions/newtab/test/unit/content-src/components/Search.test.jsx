import { GlobalOverrider } from "test/unit/utils";
import { mount, shallow } from "enzyme";
import React from "react";
import { _Search as Search } from "content-src/components/Search/Search";
import { Logo } from "content-src/components/Logo/Logo";

const DEFAULT_PROPS = {
  dispatch() {},
  Prefs: { values: { featureConfig: {}, "search.useHandoffComponent": true } },
};

describe("<Search>", () => {
  let globals;
  let sandbox;
  beforeEach(() => {
    globals = new GlobalOverrider();
    sandbox = globals.sandbox;

    global.ContentSearchUIController.prototype = { search: sandbox.spy() };
  });
  afterEach(() => {
    globals.restore();
  });

  it("should render a Search element", () => {
    const wrapper = shallow(<Search {...DEFAULT_PROPS} />);
    assert.ok(wrapper.exists());
  });
  it("should not use a <form> element", () => {
    const wrapper = mount(<Search {...DEFAULT_PROPS} />);

    assert.equal(wrapper.find("form").length, 0);
  });
  it("should show our logo when the prop exists.", () => {
    const showLogoProps = Object.assign({}, DEFAULT_PROPS, { showLogo: true });
    const wrapper = shallow(<Search {...showLogoProps} />);
    const logo_component = wrapper.find(Logo);
    assert.ok(logo_component.exists());
  });
  it("should not show our logo when the prop does not exist.", () => {
    const hideLogoProps = Object.assign({}, DEFAULT_PROPS, { showLogo: false });
    const wrapper = shallow(<Search {...hideLogoProps} />);
    const logo_component = wrapper.find(Logo);
    assert.ok(!logo_component.exists());
  });

  describe("Search Hand-off", () => {
    it("should render a Search hand-off element", () => {
      const wrapper = shallow(<Search {...DEFAULT_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find("content-search-handoff-ui").length, 1);
    });
  });
});
