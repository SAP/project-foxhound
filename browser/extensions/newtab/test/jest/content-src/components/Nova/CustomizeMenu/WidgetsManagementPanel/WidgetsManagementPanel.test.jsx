import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { WidgetsManagementPanel } from "content-src/components/Nova/CustomizeMenu/WidgetsManagementPanel/WidgetsManagementPanel";

const DEFAULT_PROPS = {
  exitEventFired: false,
  onSubpanelToggle: jest.fn(),
  togglePanel: jest.fn(),
  showPanel: false,
  enabledSections: {
    weatherEnabled: false,
  },
  enabledWidgets: {
    timerEnabled: false,
    listsEnabled: false,
    widgetsMaximized: false,
    widgetsMayBeMaximized: false,
  },
  mayHaveWeather: false,
  mayHaveTimerWidget: false,
  mayHaveListsWidget: false,
  mayHaveWeatherForecast: false,
  weatherDisplay: "simple",
  setPref: jest.fn(),
};

describe("<WidgetsManagementPanel>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".widgets-mgmt-panel-container")
    ).toBeInTheDocument();
  });
});
