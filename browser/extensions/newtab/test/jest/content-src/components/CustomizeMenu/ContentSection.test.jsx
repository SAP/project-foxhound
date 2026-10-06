import { render } from "@testing-library/react";
import { ContentSection } from "content-src/components/CustomizeMenu/ContentSection/ContentSection";

const DEFAULT_PROPS = {
  dispatch: jest.fn(),
  openPreferences: jest.fn(),
  setPref: jest.fn(),
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
  exitEventFired: false,
  onSubpanelToggle: jest.fn(),
  toggleSectionsMgmtPanel: jest.fn(),
  showSectionsMgmtPanel: false,
  novaEnabled: false,
  toggleWidgetsManagementPanel: jest.fn(),
  showWidgetsManagementPanel: false,
};

describe("<ContentSection>", () => {
  it("should render", () => {
    const { container } = render(<ContentSection {...DEFAULT_PROPS} />);
    expect(container.querySelector(".home-section")).toBeInTheDocument();
  });
});
