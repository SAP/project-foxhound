// Format datetime <input> value in the same way as we do for
// the overflow/underflow/step mismatch validation messages.
function formatDateTimeForValidityMessage(value, inputType) {
  let date;
  if (inputType === "week") {
    let parts = value.split("-W");
    console.assert(parts.length === 2, "invalid week value: " + value);
    let year = parts[0];
    let weekNumber = parseInt(parts[1]);
    let jan1 = new Date(year + "-01-01T00:00:00");
    // the day of January corresponding to year-W1-Thursday
    let dayOfW1 = ((11 - jan1.getDay()) % 7) + 1;
    // Date corresponding to year-W1-Thursday
    let w1Day1 = new Date(`${year}-01-0${dayOfW1}T00:00:00`);
    // we use the Monday of the week for the validity message
    let dayOffset = -3;
    let dayOfYear = 7 * (weekNumber - 1) + dayOffset;
    date = new Date(w1Day1.getTime() + 1000 * 60 * 60 * 24 * dayOfYear);
  } else if (inputType === "time") {
    // add arbitrary day so Date constructor is happy
    date = new Date("2000-01-01T" + value);
  } else if (inputType === "date") {
    // add arbitrary time so Date constructor uses local time instead of UTC
    date = new Date(value + "T00:00:00");
  } else if (inputType === "month") {
    date = new Date(value + "-01T00:00:00");
  } else {
    date = new Date(value);
  }
  let timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  if (date.getSeconds()) {
    timeOptions.second = "2-digit";
  }
  if (date.getMilliseconds()) {
    timeOptions.second = "2-digit";
    timeOptions.fractionalSecondDigits = 3;
  }
  let options = {
    "datetime-local": {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...timeOptions,
    },
    month: {
      year: "numeric",
      month: "2-digit",
    },
    date: {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
    time: timeOptions,
  };
  options.week = options.date;
  console.assert(
    options[inputType],
    "Invalid datetime input type: " + inputType
  );
  return date.toLocaleString(undefined, options[inputType]);
}
