import { render } from "@testing-library/react";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { WrapWithProvider } from "test/jest/test-utils";
import { Lists } from "content-src/components/Widgets/Lists/Lists";

const defaultProps = {
  dispatch: jest.fn(),
  handleUserInteraction: jest.fn(),
  isMaximized: false,
  widgetsMayBeMaximized: false,
};

function makeState(prefOverrides = {}) {
  return {
    ...INITIAL_STATE,
    Prefs: {
      ...INITIAL_STATE.Prefs,
      values: { ...INITIAL_STATE.Prefs.values, ...prefOverrides },
    },
  };
}

describe("<Lists>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <Lists {...defaultProps} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".lists")).toBeInTheDocument();
  });

  describe("change-size context menu item", () => {
    it("hides submenu when nova is disabled", () => {
      const { container } = render(
        <WrapWithProvider state={makeState({ "nova.enabled": false })}>
          <Lists {...defaultProps} widgetsMayBeMaximized={true} />
        </WrapWithProvider>
      );
      expect(
        container.querySelector(
          "span[data-l10n-id='newtab-widget-menu-change-size']"
        )
      ).not.toBeInTheDocument();
    });

    it("hides submenu when nova is enabled but widgetsMayBeMaximized is false", () => {
      const { container } = render(
        <WrapWithProvider state={makeState({ "nova.enabled": true })}>
          <Lists {...defaultProps} widgetsMayBeMaximized={false} />
        </WrapWithProvider>
      );
      expect(
        container.querySelector(
          "span[data-l10n-id='newtab-widget-menu-change-size']"
        )
      ).not.toBeInTheDocument();
    });

    it("shows submenu when nova is enabled and widgetsMayBeMaximized is true", () => {
      const { container } = render(
        <WrapWithProvider state={makeState({ "nova.enabled": true })}>
          <Lists {...defaultProps} widgetsMayBeMaximized={true} />
        </WrapWithProvider>
      );
      expect(
        container.querySelector(
          "span[data-l10n-id='newtab-widget-menu-change-size']"
        )
      ).toBeInTheDocument();
    });
  });
});
