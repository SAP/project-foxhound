/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RealtimeSuggestProvider } from "moz-src:///browser/components/urlbar/private/RealtimeSuggestProvider.sys.mjs";

/**
 * A feature that manages sports realtime suggestions.
 */
export class SportsSuggestions extends RealtimeSuggestProvider {
  get realtimeType() {
    return "sports";
  }

  get isSponsored() {
    return false;
  }

  get merinoProvider() {
    return "sports";
  }

  getViewTemplateForImage(item, index) {
    if (itemIcon(item)) {
      return super.getViewTemplateForImage(item, index);
    }

    return [
      {
        name: `scheduled-date-chiclet-day-${index}`,
        tag: "span",
        classList: ["urlbarView-sports-scheduled-date-chiclet-day"],
      },
      {
        name: `scheduled-date-chiclet-month-${index}`,
        tag: "span",
        classList: ["urlbarView-sports-scheduled-date-chiclet-month"],
      },
    ];
  }

  getViewTemplateForDescriptionTop(item, index) {
    return stringifiedScore(item.home_team.score) &&
      stringifiedScore(item.away_team.score)
      ? this.#viewTemplateTopWithScores(index)
      : this.#viewTemplateTopWithoutScores(index);
  }

  #viewTemplateTopWithScores(index) {
    return [
      {
        name: `home-team-name-${index}`,
        tag: "span",
      },
      {
        name: `home-team-score-${index}`,
        tag: "span",
        classList: ["urlbarView-sports-score"],
      },
      {
        tag: "span",
        classList: ["urlbarView-realtime-description-separator-dot"],
      },
      {
        name: `away-team-name-${index}`,
        tag: "span",
      },
      {
        name: `away-team-score-${index}`,
        tag: "span",
        classList: ["urlbarView-sports-score"],
      },
    ];
  }

  #viewTemplateTopWithoutScores(index) {
    return [
      {
        name: `team-names-${index}`,
        tag: "span",
        classList: ["urlbarView-sports-team-names"],
      },
    ];
  }

  getViewTemplateForDescriptionBottom(item, index) {
    return [
      {
        name: `sport-name-${index}`,
        tag: "span",
      },
      {
        tag: "span",
        classList: ["urlbarView-realtime-description-separator-dot"],
      },
      {
        name: `date-${index}`,
        tag: "span",
      },
      {
        tag: "span",
        classList: ["urlbarView-realtime-description-separator-dot"],
      },
      {
        name: `status-${index}`,
        tag: "span",
        classList: ["urlbarView-sports-status"],
      },
    ];
  }

  getViewUpdateForPayloadItem(item, index) {
    let topUpdate =
      stringifiedScore(item.home_team.score) &&
      stringifiedScore(item.away_team.score)
        ? this.#viewUpdateTopWithScores(item, index)
        : this.#viewUpdateTopWithoutScores(item, index);

    return {
      ...topUpdate,
      ...this.#viewUpdateImageAndBottom(item, index),
      [`item_${index}`]: {
        attributes: {
          sport: item.sport,
          status: item.status_type,
        },
      },
    };
  }

  #viewUpdateTopWithScores(item, i) {
    return {
      [`home-team-name-${i}`]: {
        textContent: item.home_team.name,
      },
      [`home-team-score-${i}`]: {
        textContent: stringifiedScore(item.home_team.score),
      },
      [`away-team-name-${i}`]: {
        textContent: item.away_team.name,
      },
      [`away-team-score-${i}`]: {
        textContent: stringifiedScore(item.away_team.score),
      },
    };
  }

  #viewUpdateTopWithoutScores(item, i) {
    return {
      [`team-names-${i}`]: {
        l10n: {
          id: "urlbar-result-sports-team-names",
          args: {
            homeTeam: item.home_team.name,
            awayTeam: item.away_team.name,
          },
        },
      },
    };
  }

  #viewUpdateImageAndBottom(item, i) {
    let date = new Date(item.date);
    let { zonedNow, zonedDate, daysUntil, isFuture } =
      SportsSuggestions._parseDate(date);

    let icon = itemIcon(item);
    let isScheduled = item.status_type == "scheduled";

    // Create the image update.
    let imageUpdate;
    if (icon) {
      // The image container will contain the icon.
      imageUpdate = {
        [`image_container_${i}`]: {
          attributes: {
            // Remove the fallback attribute by setting it to null.
            "is-fallback": null,
          },
        },
        [`image_${i}`]: {
          attributes: {
            src: icon,
          },
        },
      };
    } else {
      // Instead of an icon, the image container will be a date chiclet
      // containing the item's date as text, with the day above the month.
      let partsArray = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        timeZone: zonedNow.timeZoneId,
      }).formatToParts(date);
      let partsMap = Object.fromEntries(
        partsArray.map(({ type, value }) => [type, value])
      );
      if (partsMap.day && partsMap.month) {
        imageUpdate = {
          [`image_container_${i}`]: {
            attributes: {
              "is-fallback": "",
            },
          },
          [`scheduled-date-chiclet-day-${i}`]: {
            textContent: partsMap.day,
          },
          [`scheduled-date-chiclet-month-${i}`]: {
            textContent: partsMap.month,
          },
        };
      } else {
        // This shouldn't happen.
        imageUpdate = {};
      }
    }

    // Create the date update. First, format the date.
    let formattedDate;
    if (Math.abs(daysUntil) <= 1) {
      // Relative date: "Today", "Tomorrow", "Yesterday"
      formattedDate = capitalizeString(
        new Intl.RelativeTimeFormat(undefined, {
          numeric: "auto",
        }).format(daysUntil, "day")
      );
    } else {
      // Formatted date with some combination of year, month, day, and weekday
      let opts = {
        timeZone: zonedNow.timeZoneId,
      };
      if (!isScheduled || icon || !isFuture) {
        opts.month = "short";
        opts.day = "numeric";
        if (zonedDate.year != zonedNow.year) {
          opts.year = "numeric";
        }
      }
      if (isScheduled && isFuture) {
        opts.weekday = "short";
      }
      formattedDate = new Intl.DateTimeFormat(undefined, opts).format(date);
    }

    // Now format the time.
    let formattedTime;
    if (isScheduled && daysUntil >= 0) {
      formattedTime = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "numeric",
        timeZoneName: "short",
        timeZone: zonedNow.timeZoneId,
      }).format(date);
    }

    // Finally, create the date update.
    let dateUpdate;
    if (formattedTime) {
      dateUpdate = {
        [`date-${i}`]: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: formattedDate,
              time: formattedTime,
            },
          },
        },
      };
    } else {
      dateUpdate = {
        [`date-${i}`]: {
          textContent: formattedDate,
        },
      };
    }

    // Create the status update. Show the status if the game is live or if it
    // happened earlier today. Otherwise clear the status.
    let statusUpdate;
    if (item.status_type == "live") {
      statusUpdate = {
        [`status-${i}`]: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      };
    } else if (daysUntil == 0 && item.status_type == "past") {
      statusUpdate = {
        [`status-${i}`]: {
          l10n: {
            id: "urlbar-result-sports-status-final",
          },
        },
      };
    } else {
      statusUpdate = {
        [`status-${i}`]: {
          // Clear the status by setting its text to an empty string.
          textContent: "",
        },
      };
    }

    return {
      ...imageUpdate,
      ...dateUpdate,
      ...statusUpdate,
      [`sport-name-${i}`]: {
        textContent: item.sport,
      },
    };
  }

  /**
   * Parses a date and returns some info about it.
   *
   * This is a static method rather than a helper function internal to this file
   * so that tests can easily test it.
   *
   * @param {Date} date
   *   A `Date` object.
   * @returns {DateParseResult}
   *   The result.
   *
   * @typedef {object} DateParseResult
   * @property {typeof Temporal.ZonedDateTime} zonedNow
   *   Now as a `ZonedDateTime`.
   * @property {typeof Temporal.ZonedDateTime} zonedDate
   *   The passed-in date as a `ZonedDateTime`.
   * @property {boolean} isFuture
   *   Whether the date is in the future.
   * @property {number} daysUntil
   *   The number of calendar days from today to the date:
   *   If the date is after tomorrow: `Infinity`
   *   If the date is tomorrow: `1`
   *   If the date is today: `0`
   *   If the date is yesterday: `-1`
   *   If the date is before yesterday: `-Infinity`
   */
  static _parseDate(date) {
    // Find how many days there are from today to the date.
    let zonedNow = SportsSuggestions._zonedDateTimeISO();
    let zonedDate = date.toTemporalInstant().toZonedDateTimeISO(zonedNow);

    let today = zonedNow.startOfDay();
    let yesterday = today.subtract({ days: 1 });
    let tomorrow = today.add({ days: 1 });
    let dayAfterTomorrow = today.add({ days: 2 });

    let daysUntil;
    if (Temporal.ZonedDateTime.compare(dayAfterTomorrow, zonedDate) <= 0) {
      // date is after tomorrow
      daysUntil = Infinity;
    } else if (Temporal.ZonedDateTime.compare(tomorrow, zonedDate) <= 0) {
      // date is tomorrow
      daysUntil = 1;
    } else if (Temporal.ZonedDateTime.compare(today, zonedDate) <= 0) {
      // date is today
      daysUntil = 0;
    } else if (Temporal.ZonedDateTime.compare(yesterday, zonedDate) <= 0) {
      // date is yesterday
      daysUntil = -1;
    } else {
      // date is before yesterday
      daysUntil = -Infinity;
    }

    let isFuture = Temporal.ZonedDateTime.compare(zonedNow, zonedDate) < 0;

    return {
      zonedNow,
      zonedDate,
      isFuture,
      daysUntil,
    };
  }

  // Thin wrapper around `zonedDateTimeISO` so that tests can easily set a mock
  // "now" date and time.
  static _zonedDateTimeISO() {
    return Temporal.Now.zonedDateTimeISO();
  }
}

function itemIcon(item) {
  return item.icon || item.home_team?.icon || item.away_team?.icon;
}

function stringifiedScore(scoreValue) {
  let s = scoreValue;
  if (typeof s == "number") {
    s = String(s);
  }
  return typeof s == "string" ? s : "";
}

function capitalizeString(str) {
  return str[0].toLocaleUpperCase() + str.substring(1);
}
