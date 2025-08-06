import { mount } from "enzyme";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { ListFeed } from "content-src/components/DiscoveryStreamComponents/ListFeed/ListFeed";
import { combineReducers, createStore } from "redux";
import { Provider } from "react-redux";
import React from "react";
import { DSCard } from "../../../../../content-src/components/DiscoveryStreamComponents/DSCard/DSCard";
import { actionCreators as ac } from "common/Actions.mjs";
// import { SafeAnchor } from "../../../../../content-src/components/DiscoveryStreamComponents/SafeAnchor/SafeAnchor";

const DEFAULT_PROPS = {
  type: "foo",
  firstVisibleTimestamp: new Date("March 21, 2024 10:11:12").getTime(),
  recs: [{}, {}, {}],
  categories: [],
};

// Wrap this around any component that uses useSelector,
// or any mount that uses a child that uses redux.
function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("Discovery Stream <ListFeed>", () => {
  let wrapper;
  let sandbox;
  let dispatch;
  // let useStateSpy

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    // useStateSpy = sinon.spy(React, "useState"); // Spy on useState
    wrapper = mount(
      <WrapWithProvider>
        <ListFeed dispatch={dispatch} {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render", () => {
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".list-feed").exists());
  });

  it("should not render if rec prop is an empty array", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ListFeed dispatch={dispatch} {...DEFAULT_PROPS} recs={[]} />
      </WrapWithProvider>
    );
    assert.ok(!wrapper.find(".list-feed").exists());
  });

  it("should render a maximum of 5 cards", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ListFeed
          dispatch={dispatch}
          {...DEFAULT_PROPS}
          recs={[{}, {}, {}, {}, {}, {}, {}]}
        />
      </WrapWithProvider>
    );

    assert.lengthOf(wrapper.find(DSCard), 5);
  });

  it("should render placeholder cards if `rec` is undefined or `rec.placeholder` is true", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ListFeed
          dispatch={dispatch}
          type={"foo"}
          firstVisibleTimestamp={new Date("March 21, 2024 10:11:12").getTime()}
          recs={[
            { placeholder: true },
            { placeholder: true },
            { placeholder: true },
            { placeholder: true },
            { placeholder: true },
            { placeholder: true },
          ]}
        />
      </WrapWithProvider>
    );

    assert.ok(wrapper.find(".list-card-placeholder").exists());
    assert.lengthOf(wrapper.find(".list-card-placeholder"), 5);
  });

  describe("fakespot <ListFeed />", () => {
    const PREF_CONTEXTUAL_CONTENT_SELECTED_FEED =
      "discoverystream.contextualContent.selectedFeed";

    beforeEach(() => {
      // mock the pref for selected feed
      const state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_CONTEXTUAL_CONTENT_SELECTED_FEED]: "fakespot",
          },
        },
      };
      wrapper = mount(
        <WrapWithProvider state={state}>
          <ListFeed
            dispatch={dispatch}
            recs={[
              { category: "foo&bar" },
              { category: "foo&bar" },
              { category: "foo&bar" },
              { category: "foo&bar" },
              { category: "bar" },
              { category: "bar" },
            ]}
            categories={["foo&bar", "bar"]}
            {...DEFAULT_PROPS}
          />
        </WrapWithProvider>
      );
    });

    it("should render fakespot category dropdown", () => {
      assert.ok(wrapper.find(".fakespot-dropdown").exists());
    });

    it("should render heading copy, context menu, footer copy and cta", () => {
      assert.ok(wrapper.find(".context-menu-wrapper").exists());
      assert.ok(wrapper.find(".fakespot-desc").exists());
      assert.ok(wrapper.find(".fakespot-footer p").exists());
      assert.ok(wrapper.find(".fakespot-cta").exists());
    });

    it("when category is selected, the correct event is dispatched", () => {
      const select = wrapper.find(".fakespot-dropdown");
      // const barCategoryOption = wrapper.find("option[value='bar']");
      select.simulate("change", { target: { value: "bar" } });
      assert.calledOnce(dispatch);
      assert.calledWith(
        dispatch,
        ac.DiscoveryStreamUserEvent({
          event: "FAKESPOT_CATEGORY",
          value: {
            category: "bar",
          },
        })
      );
    });

    it("clicking on fakespot CTA should dispatch the correct event", () => {
      const safeAnchor = wrapper.find(".fakespot-cta");
      const btn = safeAnchor.find("a");
      btn.simulate("click");
      assert.calledTwice(dispatch);
      const secondCall = dispatch.getCall(1);
      assert.deepEqual(
        secondCall.args[0],
        ac.OnlyToMain({
          type: "FAKESPOT_CTA_CLICK",
        })
      );
    });
  });
});
