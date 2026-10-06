import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { _Weather as Weather } from "content-src/components/Weather/Weather";

const DISABLED_PROPS = {
  dispatch: jest.fn(),
  App: { isForStartupCache: {} },
  Prefs: { values: {} },
  Weather: { initialized: false, suggestions: [], suggestedLocations: [] },
  document: globalThis.document,
};

const ENABLED_PROPS = {
  ...DISABLED_PROPS,
  Prefs: {
    values: {
      "system.showWeather": true,
      "feeds.weatherfeed": true,
      "weather.display": "simple",
    },
  },
  Weather: {
    initialized: true,
    suggestions: [],
    suggestedLocations: [],
    locationSearchString: "",
    locationData: { city: "Test", adminName: "CA", country: "US" },
    weather: {
      date: "2024-01-01",
      current: {
        temperature: 68,
        icon: "sunny",
        summary: "Sunny",
        wind_speed: 10,
        humidity: 50,
      },
      high: 72,
      low: 55,
      feels_like: 70,
    },
  },
};

describe("<Weather>", () => {
  it("should not render without system.showWeather enabled", () => {
    const { container } = render(
      <WrapWithProvider>
        <Weather {...DISABLED_PROPS} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".weather")).not.toBeInTheDocument();
  });

  it("should render when enabled", () => {
    const { container } = render(
      <WrapWithProvider>
        <Weather {...ENABLED_PROPS} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".weather")).toBeInTheDocument();
  });
});
