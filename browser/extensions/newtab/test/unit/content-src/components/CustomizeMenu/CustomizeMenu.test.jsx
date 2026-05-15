import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { combineReducers, createStore } from "redux";

import { CustomizeMenu } from "content-src/components/CustomizeMenu/CustomizeMenu";
import { ContentSection } from "content-src/components/CustomizeMenu/ContentSection/ContentSection";

const DEFAULT_STATE = {
  ...INITIAL_STATE,
  Prefs: {
    ...INITIAL_STATE.Prefs,
    values: {
      ...INITIAL_STATE.Prefs.values,
      "newtabWallpapers.wallpaper": "",
    },
  },
};

function WrapWithProvider({ children, state = DEFAULT_STATE }) {
  const store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

let wrapper;
let sandbox;
let DEFAULT_PROPS;

describe("<CustomizeMenu>", () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    DEFAULT_PROPS = {
      showing: false,
      onOpen: sandbox.stub(),
      onClose: sandbox.stub(),
      openPreferences: sandbox.stub(),
      setPref: sandbox.stub(),
      dispatch: sandbox.stub(),
      enabledSections: {
        topSitesEnabled: true,
        pocketEnabled: true,
        weatherEnabled: true,
        showInferredPersonalizationEnabled: false,
        topSitesRowsCount: 1,
        selectedWallpaper: "",
      },
      enabledWidgets: { timerEnabled: false, listsEnabled: false },
      wallpapersEnabled: false,
      activeWallpaper: null,
      pocketRegion: "US",
      mayHaveTopicSections: false,
      mayHaveInferredPersonalization: false,
      mayHaveWeather: true,
      mayHaveWidgets: false,
      mayHaveTimerWidget: false,
      mayHaveListsWidget: false,
    };
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    sandbox.restore();
  });

  it("renders the personalize button when not showing and calls onOpen on click", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={false} />
      </WrapWithProvider>
    );

    const openBtn = wrapper.find(".personalize-button");
    assert.isTrue(openBtn.exists(), "open button renders");
    openBtn.simulate("click");
    assert.calledOnce(DEFAULT_PROPS.onOpen);
  });

  it("calls onOpen when pressing Enter on the personalize button", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={false} />
      </WrapWithProvider>
    );

    wrapper.find(".personalize-button").simulate("keydown", { key: "Enter" });
    assert.calledOnce(DEFAULT_PROPS.onOpen);
  });

  it("renders the menu when showing = true and calls onClose from the close button", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );

    const menu = wrapper.find(".customize-menu");
    assert.isTrue(menu.exists(), "customize menu renders");

    const closeBtn = wrapper.find("#close-button");
    assert.isTrue(closeBtn.exists(), "close button renders");

    closeBtn.simulate("click");
    assert.calledOnce(DEFAULT_PROPS.onClose);
  });

  it("passes key configuration props to ContentSection", () => {
    const PROPS = {
      ...DEFAULT_PROPS,
      showing: true,
      mayHaveWidgets: true,
      mayHaveTimerWidget: true,
      mayHaveListsWidget: true,
      wallpapersEnabled: true,
      enabledWidgets: { timerEnabled: true, listsEnabled: true },
    };

    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...PROPS} />
      </WrapWithProvider>
    );

    const child = wrapper.find(ContentSection);
    assert.strictEqual(child.prop("mayHaveWidgets"), true);
    assert.strictEqual(child.prop("mayHaveTimerWidget"), true);
    assert.strictEqual(child.prop("mayHaveListsWidget"), true);
    assert.strictEqual(child.prop("wallpapersEnabled"), true);
    assert.deepEqual(child.prop("enabledWidgets"), {
      timerEnabled: true,
      listsEnabled: true,
    });
  });

  it("adds subpanel-open class when onSubpanelToggle is called", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );

    const instance = wrapper.find("_CustomizeMenu").instance();

    instance.onSubpanelToggle(true);
    wrapper.update();

    const menu = wrapper.find(".customize-menu").hostNodes();
    assert.isTrue(menu.hasClass("subpanel-open"));

    instance.onSubpanelToggle(false);
    wrapper.update();

    const menuAfter = wrapper.find(".customize-menu").hostNodes();
    assert.isFalse(menuAfter.hasClass("subpanel-open"));
  });
});
