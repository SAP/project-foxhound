import { GlobalOverrider } from "test/unit/utils";
import { shallow } from "enzyme";
import React from "react";
import { Search } from "content-src/components/Search/Search";
import { Logo } from "content-src/components/Logo/Logo";
import { ExternalComponentWrapper } from "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper";

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
    const wrapper = shallow(<Search />);
    assert.ok(wrapper.exists());
  });
  it("should not use a <form> element", () => {
    const wrapper = shallow(<Search />);
    assert.equal(wrapper.find("form").length, 0);
  });
  it("should show our logo when the prop exists.", () => {
    const wrapper = shallow(<Search showLogo={true} />);
    assert.ok(wrapper.find(Logo).exists());
  });
  it("should not show our logo when the prop does not exist.", () => {
    const wrapper = shallow(<Search showLogo={false} />);
    assert.ok(!wrapper.find(Logo).exists());
  });

  describe("Search Hand-off", () => {
    it("should render a Search hand-off element", () => {
      const wrapper = shallow(<Search />);
      assert.ok(wrapper.exists());
      const externalComponentWrapper = wrapper.find(ExternalComponentWrapper);
      assert.equal(externalComponentWrapper.length, 1);
      assert.equal(externalComponentWrapper.prop("type"), "SEARCH");
    });
  });
});
