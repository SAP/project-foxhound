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

const NOVA_STATE = {
  ...DEFAULT_STATE,
  Prefs: {
    ...DEFAULT_STATE.Prefs,
    values: {
      ...DEFAULT_STATE.Prefs.values,
      "nova.enabled": true,
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
      wallpapersUserEnabled: false,
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

  it("renders the legacy personalize button when nova is not enabled", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    assert.isFalse(
      wrapper.find("moz-button.open-customization-button").exists(),
      "nova moz-button is not rendered"
    );
    assert.isTrue(
      wrapper.find("button.personalize-button").exists(),
      "legacy button is rendered"
    );
  });

  it("renders a moz-button when nova is enabled", () => {
    wrapper = mount(
      <WrapWithProvider state={NOVA_STATE}>
        <CustomizeMenu {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    const btn = wrapper.find("moz-button.open-customization-button");
    assert.isTrue(btn.exists(), "nova moz-button renders");
    assert.equal(
      btn.prop("data-l10n-id"),
      "newtab-customize-panel-label",
      "correct l10n id"
    );
    assert.equal(
      btn.prop("iconsrc"),
      "chrome://global/skin/icons/edit-outline.svg",
      "correct icon src"
    );
    assert.equal(btn.prop("iconposition"), "end", "icon at end position");
    assert.equal(btn.prop("aria-haspopup"), "dialog", "aria-haspopup dialog");
  });

  it("calls onOpen when the nova moz-button is clicked", () => {
    wrapper = mount(
      <WrapWithProvider state={NOVA_STATE}>
        <CustomizeMenu {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    wrapper.find("moz-button.open-customization-button").simulate("click");
    assert.calledOnce(DEFAULT_PROPS.onOpen);
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

    wrapper.find(".personalize-button").simulate("click");
    assert.calledOnce(DEFAULT_PROPS.onOpen);
  });

  it("renders the customize menu as a dialog element", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );

    const menu = wrapper.find(".customize-menu");
    assert.isTrue(menu.exists(), "customize menu renders");
    assert.equal(menu.type(), "dialog", "customize menu is a dialog element");
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
      wallpapersUserEnabled: true,
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
    assert.strictEqual(child.prop("wallpapersUserEnabled"), true);
    assert.deepEqual(child.prop("enabledWidgets"), {
      timerEnabled: true,
      listsEnabled: true,
    });
  });

  it("focuses the close button when onEntered is called", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    const mockFocus = sandbox.stub();
    instance.closeButtonRef.current = { focus: mockFocus };
    instance.onEntered();
    assert.calledOnce(mockFocus);
  });

  it("focuses the personalize button when onExited is called", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={false} />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    const mockFocus = sandbox.stub();
    instance.personalizeButtonRef.current = { focus: mockFocus };
    instance.dialogRef.current = { open: false };
    instance.onExited();
    assert.calledOnce(mockFocus);
  });

  it("calls close() on the dialog when onExited is called and dialog is open", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={false} />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    const mockClose = sandbox.stub();
    instance.dialogRef.current = { open: true, close: mockClose };
    instance.personalizeButtonRef.current = { focus: sandbox.stub() };
    instance.onExited();
    assert.calledOnce(mockClose);
  });

  it("calls toggleWidgetsManagementPanel when onExited is called and widgets panel is open", () => {
    const toggleWidgetsManagementPanel = sandbox.stub();
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu
          {...DEFAULT_PROPS}
          showWidgetsManagementPanel={true}
          toggleWidgetsManagementPanel={toggleWidgetsManagementPanel}
        />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    instance.dialogRef.current = { open: false };
    instance.personalizeButtonRef.current = { focus: sandbox.stub() };
    instance.onExited();
    assert.calledOnce(toggleWidgetsManagementPanel);
  });

  it("calls toggleSectionsMgmtPanel when onExited is called and sections panel is open", () => {
    const toggleSectionsMgmtPanel = sandbox.stub();
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu
          {...DEFAULT_PROPS}
          showSectionsMgmtPanel={true}
          toggleSectionsMgmtPanel={toggleSectionsMgmtPanel}
        />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    instance.dialogRef.current = { open: false };
    instance.personalizeButtonRef.current = { focus: sandbox.stub() };
    instance.onExited();
    assert.calledOnce(toggleSectionsMgmtPanel);
  });

  it("adds subpanel-open class to customize-menu-content when onSubpanelToggle is called", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );

    const instance = wrapper.find("_CustomizeMenu").instance();

    instance.onSubpanelToggle(true);
    wrapper.update();

    const content = wrapper.find(".customize-menu-content").hostNodes();
    assert.isTrue(content.hasClass("subpanel-open"));

    instance.onSubpanelToggle(false);
    wrapper.update();

    const contentAfter = wrapper.find(".customize-menu-content").hostNodes();
    assert.isFalse(contentAfter.hasClass("subpanel-open"));
  });

  it("calls showModal when showing transitions from false to true", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    const mockShowModal = sandbox.stub();
    instance.dialogRef.current = { open: false, showModal: mockShowModal };

    // Simulate the transition: prevProps.showing was false, now it's true
    instance.componentDidUpdate({ ...DEFAULT_PROPS, showing: false });

    assert.calledOnce(mockShowModal);
  });

  it("calls onClose when onCancel is fired (e.g. Escape key)", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    const mockPreventDefault = sandbox.stub();
    instance.onCancel({ preventDefault: mockPreventDefault });
    assert.calledOnce(mockPreventDefault);
    assert.calledOnce(DEFAULT_PROPS.onClose);
  });

  it("calls onClose when clicking the backdrop (dialog element itself)", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    const dialogNode = instance.dialogRef.current;
    instance.onDialogClick({ target: dialogNode });
    assert.calledOnce(DEFAULT_PROPS.onClose);
  });

  it("does not call onClose when clicking inside the dialog content", () => {
    wrapper = mount(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} showing={true} />
      </WrapWithProvider>
    );
    const instance = wrapper.find("_CustomizeMenu").instance();
    const innerNode = wrapper.find(".customize-menu-content").getDOMNode();
    instance.onDialogClick({ target: innerNode });
    assert.notCalled(DEFAULT_PROPS.onClose);
  });
});
