import { GlobalOverrider } from "test/unit/utils";
import { mount } from "enzyme";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { combineReducers, createStore } from "redux";
import { Provider } from "react-redux";
import { ExternalComponentWrapper } from "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper";
import React from "react";

const DEFAULT_PROPS = {
  type: "SEARCH",
  className: "test-wrapper",
};

const flushPromises = () => new Promise(resolve => queueMicrotask(resolve));

const createMockConfig = (overrides = {}) => ({
  type: "SEARCH",
  componentURL: "chrome://test/content/component.mjs",
  tagName: "test-component",
  l10nURLs: [],
  ...overrides,
});

const createStateWithConfig = config => ({
  ...INITIAL_STATE,
  ExternalComponents: {
    components: [config],
  },
});

const createMockElement = sandbox => {
  const element = document.createElement("div");
  sandbox.spy(element, "setAttribute");
  sandbox.spy(element.style, "setProperty");
  return element;
};

// Wrap this around any component that uses useSelector,
// or any mount that uses a child that uses redux.
function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<ExternalComponentWrapper>", () => {
  let globals;
  let sandbox;
  const TestWrapper = ExternalComponentWrapper;

  beforeEach(() => {
    globals = new GlobalOverrider();
    sandbox = globals.sandbox;
  });

  afterEach(() => {
    globals.restore();
  });

  const stubCreateElement = handlers => {
    const originalCreateElement = document.createElement.bind(document);
    return sandbox.stub(document, "createElement").callsFake(tagName => {
      if (handlers[tagName]) {
        return handlers[tagName]();
      }
      return originalCreateElement(tagName);
    });
  };

  it("should render a container div", () => {
    const wrapper = mount(
      <WrapWithProvider>
        <TestWrapper {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    assert.ok(wrapper.exists());
    assert.equal(wrapper.find("div").length, 1);
  });

  it("should apply className to container div", () => {
    const wrapper = mount(
      <WrapWithProvider>
        <TestWrapper {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    assert.equal(wrapper.find("div.test-wrapper").length, 1);
  });

  it("should warn when no configuration is found for type", async () => {
    const consoleWarnStub = sandbox.stub(console, "warn");
    mount(
      <WrapWithProvider>
        <TestWrapper {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );

    await flushPromises();

    assert.calledWith(
      consoleWarnStub,
      "No external component configuration found for type: SEARCH"
    );
  });

  it("should not render custom element without configuration", async () => {
    const importModuleStub = sandbox.stub().resolves();
    const wrapper = mount(
      <WrapWithProvider>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );

    await flushPromises();

    assert.notCalled(importModuleStub);
    wrapper.unmount();
  });

  it("should load component module when configuration is available", async () => {
    const mockConfig = createMockConfig();
    const stateWithConfig = createStateWithConfig(mockConfig);
    const importModuleStub = sandbox.stub().resolves();

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();

    assert.calledWith(importModuleStub, mockConfig.componentURL);
    wrapper.unmount();
  });

  it("should create custom element with correct tag name", async () => {
    const mockConfig = createMockConfig();
    const stateWithConfig = createStateWithConfig(mockConfig);
    const mockElement = createMockElement(sandbox);
    const importModuleStub = sandbox.stub().resolves();

    const createElementStub = stubCreateElement({
      "test-component": () => mockElement,
    });

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();

    assert.calledWith(createElementStub, "test-component");
    wrapper.unmount();
  });

  it("should add l10n link elements to document head", async () => {
    const mockConfig = createMockConfig({
      l10nURLs: ["browser/test.ftl", "browser/test2.ftl"],
    });
    const stateWithConfig = createStateWithConfig(mockConfig);
    const mockLinkElement = { rel: "", href: "", remove: sandbox.spy() };
    const importModuleStub = sandbox.stub().resolves();

    stubCreateElement({
      link: () => mockLinkElement,
      "test-component": () => createMockElement(sandbox),
    });

    const appendChildStub = sandbox.stub(document.head, "appendChild");

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();

    assert.equal(appendChildStub.callCount, 2, "Should append two l10n links");
    assert.equal(mockLinkElement.rel, "localization");
    wrapper.unmount();
  });

  it("should set attributes on custom element", async () => {
    const mockConfig = createMockConfig({
      attributes: {
        "data-test": "value",
        role: "search",
      },
    });
    const stateWithConfig = createStateWithConfig(mockConfig);
    const mockElement = createMockElement(sandbox);
    const importModuleStub = sandbox.stub().resolves();

    stubCreateElement({
      "test-component": () => mockElement,
    });

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();

    assert.calledWith(mockElement.setAttribute, "data-test", "value");
    assert.calledWith(mockElement.setAttribute, "role", "search");
    wrapper.unmount();
  });

  it("should set CSS variables on custom element", async () => {
    const mockConfig = createMockConfig({
      cssVariables: {
        "--test-color": "blue",
        "--test-size": "10px",
      },
    });
    const stateWithConfig = createStateWithConfig(mockConfig);
    const mockElement = createMockElement(sandbox);
    const importModuleStub = sandbox.stub().resolves();

    stubCreateElement({
      "test-component": () => mockElement,
    });

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();

    assert.calledWith(mockElement.style.setProperty, "--test-color", "blue");
    assert.calledWith(mockElement.style.setProperty, "--test-size", "10px");
    wrapper.unmount();
  });

  it("should handle component load errors gracefully", async () => {
    const mockConfig = createMockConfig();
    const stateWithConfig = createStateWithConfig(mockConfig);
    const consoleErrorStub = sandbox.stub(console, "error");
    const importModuleStub = sandbox
      .stub()
      .rejects(new Error("Module load failed"));

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();
    wrapper.update();

    assert.calledWith(
      consoleErrorStub,
      "Failed to load external component for type SEARCH:",
      sinon.match.instanceOf(Error)
    );

    assert.equal(wrapper.html(), "", "Should render null on error");
    wrapper.unmount();
  });

  it("should clean up l10n links on unmount", async () => {
    const mockConfig = createMockConfig({
      l10nURLs: ["browser/test.ftl"],
    });
    const stateWithConfig = createStateWithConfig(mockConfig);
    const mockLinkElements = [];
    const importModuleStub = sandbox.stub().resolves();

    stubCreateElement({
      "test-component": () => createMockElement(sandbox),
      link: () => {
        const linkEl = { remove: sandbox.spy() };
        mockLinkElements.push(linkEl);
        return linkEl;
      },
    });

    sandbox.stub(document.head, "appendChild");

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();

    assert.equal(mockLinkElements.length, 1, "Should create one l10n link");

    wrapper.unmount();

    assert.called(mockLinkElements[0].remove);
  });

  it("should not create duplicate elements on multiple renders", async () => {
    const mockConfig = createMockConfig();
    const stateWithConfig = createStateWithConfig(mockConfig);
    const mockElement = createMockElement(sandbox);
    const importModuleStub = sandbox.stub().resolves();

    const createElementStub = stubCreateElement({
      "test-component": () => mockElement,
    });

    const wrapper = mount(
      <WrapWithProvider state={stateWithConfig}>
        <TestWrapper {...DEFAULT_PROPS} importModule={importModuleStub} />
      </WrapWithProvider>
    );
    await flushPromises();

    const initialCallCount = createElementStub.callCount;

    wrapper.setProps({ className: "new-class" });
    await flushPromises();

    assert.equal(
      createElementStub.callCount,
      initialCallCount,
      "Should not create element again on re-render with same type"
    );
    wrapper.unmount();
  });
});
