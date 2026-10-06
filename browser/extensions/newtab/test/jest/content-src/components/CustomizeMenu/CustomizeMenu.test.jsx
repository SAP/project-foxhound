import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { _CustomizeMenu as CustomizeMenu } from "content-src/components/CustomizeMenu/CustomizeMenu";

const DEFAULT_PROPS = {
  dispatch: jest.fn(),
  onOpen: jest.fn(),
  onClose: jest.fn(),
  openPreferences: jest.fn(),
  setPref: jest.fn(),
  showing: false,
  enabledSections: {
    topSitesEnabled: true,
    pocketEnabled: false,
    weatherEnabled: false,
    showInferredPersonalizationEnabled: false,
    topSitesRowsCount: 1,
  },
  enabledWidgets: {
    timerEnabled: false,
    listsEnabled: false,
    widgetsMaximized: false,
    widgetsMayBeMaximized: false,
  },
  wallpapersEnabled: false,
  wallpapersUserEnabled: false,
  activeWallpaper: null,
  pocketRegion: false,
  mayHaveTopicSections: false,
  mayHaveInferredPersonalization: false,
  mayHaveWeather: false,
  mayHaveWidgets: false,
  mayHaveWeatherForecast: false,
  weatherDisplay: "simple",
  mayHaveTimerWidget: false,
  mayHaveListsWidget: false,
  toggleSectionsMgmtPanel: jest.fn(),
  showSectionsMgmtPanel: false,
  toggleWidgetsManagementPanel: jest.fn(),
  showWidgetsManagementPanel: false,
  Prefs: { values: {} },
};

const NOVA_PROPS = {
  ...DEFAULT_PROPS,
  Prefs: { values: { "nova.enabled": true } },
};

describe("<CustomizeMenu>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".personalize-button")).toBeInTheDocument();
  });

  it("renders the legacy button when nova is not enabled", () => {
    const { container } = render(
      <WrapWithProvider>
        <CustomizeMenu {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector("moz-button.open-customization-button")
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("button.personalize-button")
    ).toBeInTheDocument();
  });

  it("renders moz-button with correct attributes when nova is enabled", () => {
    const { container } = render(
      <WrapWithProvider>
        <CustomizeMenu {...NOVA_PROPS} />
      </WrapWithProvider>
    );
    const btn = container.querySelector("moz-button.open-customization-button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-l10n-id", "newtab-customize-panel-label");
    expect(btn).toHaveAttribute(
      "iconsrc",
      "chrome://global/skin/icons/edit-outline.svg"
    );
    expect(btn).toHaveAttribute("iconposition", "end");
    expect(btn).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("calls onOpen when the nova moz-button is clicked", () => {
    const onOpen = jest.fn();
    const { container } = render(
      <WrapWithProvider>
        <CustomizeMenu {...NOVA_PROPS} onOpen={onOpen} />
      </WrapWithProvider>
    );
    container.querySelector("moz-button.open-customization-button").click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
