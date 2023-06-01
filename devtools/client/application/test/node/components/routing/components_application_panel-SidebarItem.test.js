/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Import libs
const { shallow } = require("enzyme");
const { createFactory } = require("react");

const {
  setupStore,
} = require("resource://devtools/client/application/test/node/helpers.js");

const {
  PAGE_TYPES,
} = require("resource://devtools/client/application/src/constants.js");

const SidebarItem = createFactory(
  require("resource://devtools/client/application/src/components/routing/SidebarItem.js")
);

/**
 * Test for SidebarItem.js component
 */

describe("SidebarItem", () => {
  function buildStoreWithSelectedPage(selectedPage) {
    return setupStore({
      ui: {
        selectedPage,
      },
    });
  }

  it("renders the expected snapshot when the manifest page is selected", () => {
    const store = buildStoreWithSelectedPage(PAGE_TYPES.MANIFEST);
    const wrapper = shallow(
      SidebarItem({
        store,
        page: "manifest",
        isSelected: true,
      })
    ).dive();
    expect(wrapper).toMatchSnapshot();
  });

  it("renders the expected snapshot when the service-workers page is selected", () => {
    const store = buildStoreWithSelectedPage(PAGE_TYPES.SERVICE_WORKERS);
    const wrapper = shallow(
      SidebarItem({
        store,
        isSelected: true,
        page: "service-workers",
      })
    ).dive();
    expect(wrapper).toMatchSnapshot();
  });

  it("renders the expected snapshot when the manifest page is not selected", () => {
    const store = buildStoreWithSelectedPage(PAGE_TYPES.MANIFEST);
    const wrapper = shallow(
      SidebarItem({
        store,
        isSelected: false,
        page: "manifest",
      })
    ).dive();
    expect(wrapper).toMatchSnapshot();
  });

  it("renders the expected snapshot when the service-workers page is not selected", () => {
    const store = buildStoreWithSelectedPage(PAGE_TYPES.SERVICE_WORKERS);
    const wrapper = shallow(
      SidebarItem({
        store,
        isSelected: false,
        page: "service-workers",
      })
    ).dive();
    expect(wrapper).toMatchSnapshot();
  });
});
