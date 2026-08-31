/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { InterestPicker } from "content-src/components/DiscoveryStreamComponents/InterestPicker/InterestPicker";
import { combineReducers, createStore } from "redux";

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<InterestPicker />", () => {
  const DEFAULT_PROPS = {
    title: "Pick your interests",
    subtitle: "Choose topics you care about",
    receivedFeedRank: 1,
    interests: [
      { sectionId: "section-1", title: "Technology", followable: true },
      { sectionId: "section-2", title: "Sports", followable: true },
      { sectionId: "section-3", title: "Hidden", followable: false },
    ],
  };

  it("should filter out interests with followable: false", () => {
    const wrapper = mount(
      <WrapWithProvider>
        <InterestPicker {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );

    const items = wrapper.find(".topic-item-label");
    assert.equal(items.length, 2);
    assert.equal(items.at(0).text(), "Technology");
    assert.equal(items.at(1).text(), "Sports");
  });

  it("should render all interests when all have followable: true", () => {
    const wrapper = mount(
      <WrapWithProvider>
        <InterestPicker
          {...DEFAULT_PROPS}
          interests={[
            { sectionId: "section-1", title: "Technology", followable: true },
            { sectionId: "section-2", title: "Sports", followable: true },
          ]}
        />
      </WrapWithProvider>
    );

    assert.equal(wrapper.find(".topic-item-label").length, 2);
  });

  it("should render interests when followable is undefined", () => {
    const wrapper = mount(
      <WrapWithProvider>
        <InterestPicker
          {...DEFAULT_PROPS}
          interests={[
            {
              sectionId: "section-1",
              title: "Technology",
              followable: undefined,
            },
            { sectionId: "section-2", title: "Sports", followable: undefined },
          ]}
        />
      </WrapWithProvider>
    );

    assert.equal(wrapper.find(".topic-item-label").length, 2);
  });

  it("should render no interests when all have followable: false", () => {
    const wrapper = mount(
      <WrapWithProvider>
        <InterestPicker
          {...DEFAULT_PROPS}
          interests={[
            { sectionId: "section-1", title: "Technology", followable: false },
            { sectionId: "section-2", title: "Sports", followable: false },
          ]}
        />
      </WrapWithProvider>
    );

    assert.equal(wrapper.find(".topic-item-label").length, 0);
  });
});
