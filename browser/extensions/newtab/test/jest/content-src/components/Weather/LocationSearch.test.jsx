import { render, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers } from "redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { actionTypes as at } from "common/Actions.mjs";
import { WrapWithProvider } from "test/jest/test-utils";
import { LocationSearch } from "content-src/components/Weather/LocationSearch";

const baseState = {
  ...INITIAL_STATE,
  Prefs: {
    ...INITIAL_STATE.Prefs,
    values: {
      ...INITIAL_STATE.Prefs.values,
      "nova.enabled": false,
      "system.showWeatherOptIn": false,
      "weather.optInAccepted": false,
    },
  },
  Weather: {
    ...INITIAL_STATE.Weather,
    suggestedLocations: [],
    locationSearchString: "",
  },
};

function renderLocationSearch(state = baseState) {
  const store = createStore(combineReducers(reducers), state);
  jest.spyOn(store, "dispatch");
  const { container } = render(
    <Provider store={store}>
      <LocationSearch outerClassName="weather" />
    </Provider>
  );
  return { container, dispatch: store.dispatch };
}

describe("<LocationSearch>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <LocationSearch outerClassName="weather" />
      </WrapWithProvider>
    );
    expect(container.querySelector(".location-search")).toBeInTheDocument();
  });

  describe("use current location button", () => {
    it("hides the button when nova is disabled", () => {
      const { container } = renderLocationSearch();
      expect(
        container.querySelector(
          "[data-l10n-id='newtab-weather-change-location-search-use-current']"
        )
      ).not.toBeInTheDocument();
    });

    it("shows the button when nova is enabled and weatherOptIn is false", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: { ...baseState.Prefs.values, "nova.enabled": true },
        },
      };
      const { container } = renderLocationSearch(state);
      expect(
        container.querySelector(
          "[data-l10n-id='newtab-weather-change-location-search-use-current']"
        )
      ).toBeInTheDocument();
    });

    it("shows the button when nova is enabled, weatherOptIn is true, and user has accepted", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            "nova.enabled": true,
            "system.showWeatherOptIn": true,
            "weather.optInAccepted": true,
          },
        },
      };
      const { container } = renderLocationSearch(state);
      expect(
        container.querySelector(
          "[data-l10n-id='newtab-weather-change-location-search-use-current']"
        )
      ).toBeInTheDocument();
    });

    it("hides the button when nova is enabled, weatherOptIn is true, and user has not accepted", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            "nova.enabled": true,
            "system.showWeatherOptIn": true,
            "weather.optInAccepted": false,
          },
        },
      };
      const { container } = renderLocationSearch(state);
      expect(
        container.querySelector(
          "[data-l10n-id='newtab-weather-change-location-search-use-current']"
        )
      ).not.toBeInTheDocument();
    });

    it("dispatches WEATHER_USER_OPT_IN_LOCATION and closes search on click", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: { ...baseState.Prefs.values, "nova.enabled": true },
        },
      };
      const { container, dispatch } = renderLocationSearch(state);
      const button = container.querySelector(
        "[data-l10n-id='newtab-weather-change-location-search-use-current']"
      );
      fireEvent.click(button);

      const calls = dispatch.mock.calls.map(([action]) => action);
      expect(calls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: at.WEATHER_USER_OPT_IN_LOCATION }),
          expect.objectContaining({
            type: at.WEATHER_SEARCH_ACTIVE,
            data: false,
          }),
        ])
      );
    });
  });
});
