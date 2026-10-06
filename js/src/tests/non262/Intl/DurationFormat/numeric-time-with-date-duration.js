const {
  Integer, Literal, Unit
} = NumberFormatParts;

const {
  Year, Month, Week, Day, Hour, Minute, Second
} = DurationFormatParts;

const locale = "en";

function expectedParts(resolvedOptions, timeUnit, duration) {
  let parts = [];

  function durationPart(part, unit, value) {
    if (value === 0 && resolvedOptions[unit + "sDisplay"] === "auto") {
      return;
    }

    if (value !== 1) {
      unit += "s";
    }
    if (parts.length) {
      parts.push(Literal(", "));
    }
    parts.push(...part(Integer(String(value)), Literal(" "), Unit(unit)));
  }

  let {years, months, weeks, days} = Temporal.Duration.from(duration);
  durationPart(Year, "year", years);
  durationPart(Month, "month", months);
  durationPart(Week, "week", weeks);
  durationPart(Day, "day", days);

  switch (timeUnit) {
    case "hours": {
      if (resolvedOptions.hoursDisplay === "always") {
        parts.push(
          Literal(", "),
          ...Hour(Integer("0")),
        );

        if (resolvedOptions.minutesDisplay === "always" ||
            resolvedOptions.secondsDisplay === "always") {
          parts.push(
            Literal(":"),
            ...Minute(Integer("00")),
          );
        }

        if (resolvedOptions.secondsDisplay === "always") {
          parts.push(
            Literal(":"),
            ...Second(Integer("00")),
          );
        }
      } else if (resolvedOptions.minutesDisplay === "always") {
        parts.push(
          Literal(", "),
          ...Minute(Integer("00")),
        );
        if (resolvedOptions.secondsDisplay === "always") {
          parts.push(
            Literal(":"),
            ...Second(Integer("00")),
          );
        }
      } else if (resolvedOptions.secondsDisplay === "always") {
        parts.push(
          Literal(", "),
          ...Second(Integer("00")),
        );
      }
      break;
    }
    case "minutes": {
      if (resolvedOptions.hoursDisplay === "always") {
        durationPart(Hour, "hour", 0);
      }
      if (resolvedOptions.minutesDisplay === "always") {
        parts.push(
          Literal(", "),
          ...Minute(Integer("0")),
        );
        if (resolvedOptions.secondsDisplay === "always") {
          parts.push(
            Literal(":"),
            ...Second(Integer("00")),
          );
        }
      } else if (resolvedOptions.secondsDisplay === "always") {
        parts.push(
          Literal(", "),
          ...Second(Integer("00")),
        );
      }
      break;
    }
    case "seconds": {
      if (resolvedOptions.hoursDisplay === "always") {
        durationPart(Hour, "hour", 0);
      }
      if (resolvedOptions.minutesDisplay === "always") {
        durationPart(Minute, "minute", 0);
      }
      if (resolvedOptions.secondsDisplay === "always") {
        parts.push(
          Literal(", "),
          ...Second(Integer("0")),
        );
      }
      break;
    }
    default:
      throw new Error(`unexpected time unit: ${timeUnit}`);
  }

  return parts;
}

const timeUnits = [
  "hours",
  "minutes",
  "seconds",
];

const dateDurations = [
  "P1Y",
  "P1Y2M",
  "P1Y2M3W",
  "P1Y2M3W4D",
  "P1M",
  "P1M2W",
  "P1M2W3D",
  "P1W",
  "P1W2D",
  "P1D",
];

const displayStyles = [
  undefined, "always", "auto",
];

for (let unit of timeUnits) {
  for (let hoursDisplay of displayStyles) {
    for (let minutesDisplay of displayStyles) {
      for (let secondsDisplay of displayStyles) {
        let df = new Intl.DurationFormat(locale, {
          style: "long",
          [unit]: "numeric",
          hoursDisplay,
          minutesDisplay,
          secondsDisplay,
        });
        let resolvedOptions = df.resolvedOptions();

        for (let duration of dateDurations) {
          let expected = expectedParts(resolvedOptions, unit, duration);
          let str = PartsToString(expected);

          assertEq(df.format(duration), str, `unit=${unit}, duration=${duration}`);

          let parts = df.formatToParts(duration);
          assertEq(PartsToString(parts), str, `unit=${unit}, duration=${duration}`);
          assertEq(parts.length, expected.length, `unit=${unit}, duration=${duration}`);

          assertDeepEq(parts, expected);
        }
      }
    }
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
