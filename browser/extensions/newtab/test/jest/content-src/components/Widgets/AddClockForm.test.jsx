/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { fireEvent, render } from "@testing-library/react";
import { AddClockForm } from "content-src/components/Widgets/Clocks/AddClockForm";

const SUPPORTED_TIME_ZONES = [
  "Europe/Berlin",
  "Australia/Sydney",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
];

function renderForm(overrides = {}) {
  const props = {
    isEditing: false,
    initialClock: null,
    canAddClock: true,
    supportedTimeZones: SUPPORTED_TIME_ZONES,
    onSave: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  const result = render(<AddClockForm {...props} />);
  return { ...result, props };
}

function setSearchValue(container, value) {
  const input = container.querySelector(".clocks-search-location-input");
  Object.defineProperty(input, "value", {
    configurable: true,
    writable: true,
    value,
  });
  fireEvent.input(input);
  return input;
}

// Per-zone Intl.DateTimeFormat mock for render tests that need
// different localized names across multiple time zones in one run.
// The inner stub must stay a `function` expression — arrow functions
// can't be invoked with `new`, which production code does.
const installMockedIntl = nameByTimeZone => {
  const Original = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function (locale, options = {}) {
    const tz = options.timeZone;
    const value = tz && nameByTimeZone[tz];
    return {
      format: () => "",
      formatToParts: () => (value ? [{ type: "timeZoneName", value }] : []),
      resolvedOptions: () => ({ timeZone: tz }),
    };
  };
  return () => {
    Intl.DateTimeFormat = Original;
  };
};

describe("<AddClockForm>", () => {
  describe("rendering", () => {
    it("renders an empty form when no initialClock is supplied", () => {
      const { container } = renderForm();
      expect(container.querySelector(".clocks-add-form")).toBeInTheDocument();
      expect(
        container
          .querySelector(".clocks-search-location-input")
          .getAttribute("value")
      ).toBe("");
      expect(
        container.querySelector(".clocks-nickname-input").getAttribute("value")
      ).toBe("");
    });

    it("pre-fills inputs from initialClock when editing", () => {
      const { container } = renderForm({
        isEditing: true,
        initialClock: {
          timeZone: "America/New_York",
          city: "Boston",
          label: "Office",
          labelColor: "cyan",
        },
      });
      expect(
        container
          .querySelector(".clocks-search-location-input")
          .getAttribute("value")
      ).toBe("Boston");
      expect(
        container.querySelector(".clocks-nickname-input").getAttribute("value")
      ).toBe("Office");
    });

    it("falls back to deriving the city from the timezone when initialClock has no city", () => {
      const { container } = renderForm({
        isEditing: true,
        initialClock: {
          timeZone: "America/Los_Angeles",
          label: null,
          labelColor: null,
        },
      });
      expect(
        container
          .querySelector(".clocks-search-location-input")
          .getAttribute("value")
      ).toBe("Los Angeles");
    });

    it("uses the add-clock l10n id in add mode", () => {
      const { container } = renderForm();
      expect(
        container.querySelector(".clocks-add-form").getAttribute("data-l10n-id")
      ).toBe("newtab-clock-widget-add-clock-form");
      expect(
        container
          .querySelector(".clocks-form-submit")
          .getAttribute("data-l10n-id")
      ).toBe("newtab-clock-widget-button-add-clock");
    });

    it("uses the edit-clock l10n id in edit mode", () => {
      const { container } = renderForm({
        isEditing: true,
        initialClock: {
          timeZone: "Europe/Berlin",
          label: null,
          labelColor: null,
        },
      });
      expect(
        container.querySelector(".clocks-add-form").getAttribute("data-l10n-id")
      ).toBe("newtab-clock-widget-edit-clock-form");
      expect(
        container
          .querySelector(".clocks-form-submit")
          .getAttribute("data-l10n-id")
      ).toBe("newtab-clock-widget-button-save");
    });
  });

  describe("search dropdown", () => {
    it("shows matching results as the user types", () => {
      const { container } = renderForm();
      setSearchValue(container, "Ber");
      const results = container.querySelectorAll(".clocks-search-result");
      expect(results.length).toBeGreaterThan(0);
      expect(
        results[0].querySelector(".clocks-search-result-city").textContent
      ).toBe("Berlin");
    });

    it("renders and searches by the localized zone name built from Intl", () => {
      const restore = installMockedIntl({
        "Europe/Berlin": "Central European Time",
        "Australia/Sydney": "Eastern Australia Time",
        "America/New_York": "Eastern Time",
        "America/Los_Angeles": "Pacific Time",
        "Asia/Tokyo": "Japan Time",
      });
      try {
        const { container } = renderForm();
        setSearchValue(container, "Tok");
        const result = container.querySelector(".clocks-search-result");
        expect(
          result.querySelector(".clocks-search-result-timezone").textContent
        ).toBe("Japan Time");
        setSearchValue(container, "Pacific");
        const cities = Array.from(
          container.querySelectorAll(".clocks-search-result-city")
        ).map(el => el.textContent);
        expect(cities).toContain("Los Angeles");
      } finally {
        restore();
      }
    });

    it("renders results as div role='option' (not buttons) per ARIA combobox pattern", () => {
      const { container } = renderForm();
      setSearchValue(container, "Berlin");
      const result = container.querySelector(".clocks-search-result");
      expect(result.tagName).toBe("DIV");
      expect(result.getAttribute("role")).toBe("option");
      expect(result.getAttribute("tabIndex")).toBe("0");
    });

    it("keeps the results list open on a full city name and closes it only after a row is clicked", () => {
      const { container } = renderForm();
      setSearchValue(container, "Berlin");
      expect(
        container.querySelector("#clocks-search-results")
      ).toBeInTheDocument();
      const result = container.querySelector(".clocks-search-result");
      expect(result).toBeInTheDocument();
      fireEvent.click(result);
      expect(
        container.querySelector("#clocks-search-results")
      ).not.toBeInTheDocument();
    });

    it("selects a timezone when a result is clicked, replacing the search value with the city", () => {
      const { container } = renderForm();
      setSearchValue(container, "Tok");
      fireEvent.click(container.querySelector(".clocks-search-result"));
      expect(
        container.querySelector(".clocks-search-location-input").value
      ).toBe("Tokyo");
    });

    it("selects a result via Enter on the option", () => {
      const { container } = renderForm();
      setSearchValue(container, "Tok");
      const result = container.querySelector(".clocks-search-result");
      fireEvent.keyDown(result, { key: "Enter" });
      expect(
        container.querySelector(".clocks-search-location-input").value
      ).toBe("Tokyo");
    });

    it("sets aria-activedescendant only after a selection is made and the dropdown is open", () => {
      const { container } = renderForm();
      const input = container.querySelector(".clocks-search-location-input");
      setSearchValue(container, "Ber");
      // No selection yet — aria-activedescendant should not point anywhere.
      expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    });

    it("renders a no-results message inside the listbox when the query matches nothing", () => {
      const { container } = renderForm();
      setSearchValue(container, "zzz");
      const listbox = container.querySelector("#clocks-search-results");
      expect(listbox).toBeInTheDocument();
      expect(listbox.getAttribute("role")).toBe("listbox");
      expect(
        container.querySelector(".clocks-search-result")
      ).not.toBeInTheDocument();
      const empty = listbox.querySelector(".clocks-search-no-results");
      expect(empty).toBeInTheDocument();
      expect(empty.getAttribute("role")).toBe("option");
      expect(empty.getAttribute("aria-disabled")).toBe("true");
      expect(empty.getAttribute("aria-selected")).toBe("false");
      expect(empty.getAttribute("data-l10n-id")).toBe(
        "newtab-clock-widget-search-no-results"
      );
    });
  });

  describe("submit", () => {
    it("does nothing when no timezone is resolved", () => {
      const { container, props } = renderForm();
      fireEvent.click(container.querySelector(".clocks-form-submit"));
      expect(props.onSave).not.toHaveBeenCalled();
    });

    it("calls onSave with a built zone when a city is matched and submit is clicked", () => {
      const { container, props } = renderForm();
      setSearchValue(container, "Berlin");
      fireEvent.click(container.querySelector(".clocks-form-submit"));
      expect(props.onSave).toHaveBeenCalledTimes(1);
      expect(props.onSave).toHaveBeenCalledWith({
        timeZone: "Europe/Berlin",
        city: "Berlin",
        label: null,
        labelColor: null,
      });
    });

    it("trims the nickname and assigns a random labelColor when one is added", () => {
      const randomStub = jest.spyOn(Math, "random").mockReturnValue(0);
      try {
        const { container, props } = renderForm();
        setSearchValue(container, "Berlin");
        const nicknameInput = container.querySelector(".clocks-nickname-input");
        Object.defineProperty(nicknameInput, "value", {
          configurable: true,
          writable: true,
          value: "  Office  ",
        });
        fireEvent.input(nicknameInput);
        fireEvent.click(container.querySelector(".clocks-form-submit"));
        const [[savedZone]] = props.onSave.mock.calls;
        expect(savedZone.label).toBe("Office");
        expect(savedZone.labelColor).toBe("cyan"); // First non-neutral palette entry.
      } finally {
        randomStub.mockRestore();
      }
    });

    it("trims an over-long label coming in via initialClock to MAX_NICKNAME_LENGTH", () => {
      // Defensive cap for legacy/external pref values that may exceed the
      // limit the input enforces interactively.
      const { container, props } = renderForm({
        isEditing: true,
        initialClock: {
          timeZone: "Europe/Berlin",
          city: "Berlin",
          label: "Way too long nickname here",
          labelColor: "purple",
        },
      });
      fireEvent.click(container.querySelector(".clocks-form-submit"));
      const [[savedZone]] = props.onSave.mock.calls;
      expect(savedZone.label).toBe("Way too lon"); // 11 chars
      expect(savedZone.label.length).toBe(11);
    });

    it("preserves the existing labelColor when editing the same zone", () => {
      const { container, props } = renderForm({
        isEditing: true,
        initialClock: {
          timeZone: "Europe/Berlin",
          city: "Berlin",
          label: "Home",
          labelColor: "purple",
        },
      });
      // Submit unchanged — labelColor should be preserved.
      fireEvent.click(container.querySelector(".clocks-form-submit"));
      const [[savedZone]] = props.onSave.mock.calls;
      expect(savedZone.labelColor).toBe("purple");
    });

    it("disables the submit button until a valid timezone is resolved", () => {
      const { container } = renderForm();
      const submit = container.querySelector(".clocks-form-submit");
      expect(submit.hasAttribute("disabled")).toBe(true);
      setSearchValue(container, "Berlin");
      expect(submit.hasAttribute("disabled")).toBe(false);
    });

    it("submits via Enter on the form when not focused on a result or button", () => {
      const { container, props } = renderForm();
      setSearchValue(container, "Berlin");
      const nicknameInput = container.querySelector(".clocks-nickname-input");
      fireEvent.keyDown(nicknameInput, { key: "Enter" });
      expect(props.onSave).toHaveBeenCalled();
    });

    it("does not submit when Enter is pressed on the Cancel or Submit button", () => {
      // Enter on a focused button should fire that button's own click via
      // native HTML semantics, not the form's onKeyDown=Enter submit path.
      const { container, props } = renderForm();
      setSearchValue(container, "Berlin");
      const cancelButton = container.querySelector(
        "moz-button[data-l10n-id='newtab-clock-widget-button-cancel']"
      );
      fireEvent.keyDown(cancelButton, { key: "Enter" });
      const submitButton = container.querySelector(".clocks-form-submit");
      fireEvent.keyDown(submitButton, { key: "Enter" });
      expect(props.onSave).not.toHaveBeenCalled();
    });
  });

  describe("cancellation", () => {
    it("calls onCancel when the cancel button is clicked", () => {
      const { container, props } = renderForm();
      fireEvent.click(
        container.querySelector(
          "moz-button[data-l10n-id='newtab-clock-widget-button-cancel']"
        )
      );
      expect(props.onCancel).toHaveBeenCalled();
    });

    it("calls onCancel on Escape inside the form", () => {
      const { container, props } = renderForm();
      const input = container.querySelector(".clocks-search-location-input");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(props.onCancel).toHaveBeenCalled();
    });

    it("calls onCancel when focus moves outside the form", () => {
      const { container, props } = renderForm();
      const form = container.querySelector(".clocks-add-form");
      const outside = document.createElement("button");
      document.body.appendChild(outside);
      try {
        fireEvent.blur(form, { relatedTarget: outside });
        expect(props.onCancel).toHaveBeenCalled();
      } finally {
        outside.remove();
      }
    });

    it("does not call onCancel when relatedTarget is null (window blur)", () => {
      const { container, props } = renderForm();
      fireEvent.blur(container.querySelector(".clocks-add-form"), {
        relatedTarget: null,
      });
      expect(props.onCancel).not.toHaveBeenCalled();
    });
  });
});
