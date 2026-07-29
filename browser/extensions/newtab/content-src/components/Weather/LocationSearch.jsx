/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useEffect, useRef, useState } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";

function LocationSearch({ outerClassName, onLocationSelected }) {
  // should be the location object from suggestedLocations
  const [selectedLocation, setSelectedLocation] = useState("");
  const suggestedLocations = useSelector(
    state => state.Weather.suggestedLocations
  );
  const locationSearchString = useSelector(
    state => state.Weather.locationSearchString
  );
  const novaEnabled = useSelector(state => state.Prefs.values["nova.enabled"]);
  const weatherOptIn = useSelector(
    state => state.Prefs.values["system.showWeatherOptIn"]
  );
  const optInAccepted = useSelector(
    state => state.Prefs.values["weather.optInAccepted"]
  );
  const showCurrentLocation = !weatherOptIn || optInAccepted;

  const [userInput, setUserInput] = useState(locationSearchString || "");
  const inputRef = useRef(null);

  const dispatch = useDispatch();

  useEffect(() => {
    if (selectedLocation) {
      dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_LOCATION_DATA_UPDATE,
          data: {
            city: selectedLocation.localized_name,
            adminName: selectedLocation.administrative_area,
            country: selectedLocation.country,
          },
        })
      );
      dispatch(ac.SetPref("weather.query", selectedLocation.key));
      dispatch(
        ac.BroadcastToContent({
          type: at.WEATHER_SEARCH_ACTIVE,
          data: false,
        })
      );
      onLocationSelected?.();
    }
  }, [selectedLocation, dispatch, onLocationSelected]);

  // when component mounts, set focus to input
  useEffect(() => {
    inputRef?.current?.focus();
  }, [inputRef]);

  function handleChange(event) {
    const { value } = event.target;
    setUserInput(value);

    // if the user input contains less than three characters and suggestedLocations is not an empty array,
    // reset suggestedLocations to [] so there aren't incorrect items in the datalist
    if (value.length < 3 && suggestedLocations.length) {
      dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_LOCATION_SUGGESTIONS_UPDATE,
          data: [],
        })
      );
    }
    // find match in suggestedLocation array
    const match = suggestedLocations?.find(({ key }) => key === value);
    if (match) {
      setSelectedLocation(match);
      setUserInput(
        `${match.localized_name}, ${match.administrative_area.localized_name}`
      );
    } else if (value.length >= 3 && !match) {
      dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_LOCATION_SEARCH_UPDATE,
          data: value,
        })
      );
    }
  }

  function handleCloseSearch() {
    dispatch(
      ac.BroadcastToContent({
        type: at.WEATHER_SEARCH_ACTIVE,
        data: false,
      })
    );
    setUserInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      handleCloseSearch();
    }
  }

  function handleUseCurrentLocation() {
    batch(() => {
      dispatch(ac.AlsoToMain({ type: at.WEATHER_USER_OPT_IN_LOCATION }));
      dispatch(
        ac.BroadcastToContent({ type: at.WEATHER_SEARCH_ACTIVE, data: false })
      );
    });
  }

  return (
    <div className={`${outerClassName} location-search`}>
      <div className="location-input-wrapper">
        <div className="search-icon" />
        <input
          ref={inputRef}
          list="merino-location-list"
          type="text"
          data-l10n-id="newtab-weather-change-location-search-input-placeholder"
          onChange={handleChange}
          value={userInput}
          onKeyDown={handleKeyDown}
          className="location-input"
        />
        <moz-button
          className="close-icon"
          type="icon ghost"
          size="small"
          iconSrc="chrome://global/skin/icons/close.svg"
          onClick={handleCloseSearch}
        />
        <datalist id="merino-location-list">
          {(suggestedLocations || []).map(merinoLocation => (
            <option value={merinoLocation.key} key={merinoLocation.key}>
              {merinoLocation.localized_name},{" "}
              {merinoLocation.administrative_area.localized_name}
            </option>
          ))}
        </datalist>
      </div>
      {showCurrentLocation && novaEnabled && (
        <moz-button
          data-l10n-id="newtab-weather-change-location-search-use-current"
          type="icon ghost"
          iconSrc="chrome://browser/skin/notification-icons/geo.svg"
          onClick={handleUseCurrentLocation}
        />
      )}
    </div>
  );
}

export { LocationSearch };
