import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { _TopSites as TopSites } from "content-src/components/TopSites/TopSites";

const DEFAULT_PROPS = {
  dispatch: jest.fn(),
  App: { isForStartupCache: {} },
  TopSites: {
    initialized: true,
    rows: [],
    editForm: null,
    showSearchShortcutsForm: false,
  },
  Prefs: { values: {} },
  TopSitesRows: 1,
  TopSitesMaxSitesPerRow: 8,
};

describe("<TopSites>", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }),
    });
    Object.defineProperty(window.performance, "mark", {
      configurable: true,
      value: jest.fn(),
    });
  });

  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <TopSites {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".top-sites")).toBeInTheDocument();
  });
});
