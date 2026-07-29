/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { fireEvent, render } from "@testing-library/react";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { actionTypes as at } from "common/Actions.mjs";
import { WrapWithProvider } from "test/jest/test-utils";
import { WatchLiveModal } from "content-src/components/Widgets/SportsWidget/WatchLiveModal";

const watchLiveData = {
  your_region: [
    {
      product_name: "Tubi",
      entitlement: "Free",
      url: "https://tubitv.com/",
    },
    {
      product_name: "FIFA+",
      // Not in the entitlement map — should fall back to the literal string.
      entitlement: "FIFA+",
      url: "https://fifa.plus/",
    },
  ],
  other_regions: [
    {
      country_code: "CAN",
      streams: [
        {
          product_name: "RDS",
          entitlement: "Free and Paid",
          url: "https://rds.ca/",
        },
      ],
    },
  ],
};

function makeState({ loaded = false, data = null } = {}) {
  return {
    ...INITIAL_STATE,
    SportsWidget: {
      ...INITIAL_STATE.SportsWidget,
      watchLive: { loaded, data },
    },
  };
}

function renderModal({ state, onClose, dispatch, widgetSize = "medium" }) {
  return render(
    <WrapWithProvider state={state}>
      <WatchLiveModal
        onClose={onClose ?? jest.fn()}
        dispatch={dispatch ?? jest.fn()}
        widgetSize={widgetSize}
      />
    </WrapWithProvider>
  );
}

function findUserEvents(dispatch, userAction) {
  return dispatch.mock.calls
    .map(([action]) => action)
    .filter(
      a => a.type === at.WIDGETS_USER_EVENT && a.data.user_action === userAction
    );
}

describe("<WatchLiveModal>", () => {
  beforeAll(() => {
    // jsdom doesn't implement these — the modal calls them imperatively.
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close = jest.fn();
    // Scrolled when Other regions expand; jsdom has no native scrollIntoView.
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the loading placeholder while loaded is false", () => {
    const { container } = renderModal({ state: makeState() });
    expect(
      container.querySelector(".watch-live-modal-loading")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".watch-live-modal-list")
    ).not.toBeInTheDocument();
  });

  it("renders the your_region stream list when loaded with data", () => {
    const { container } = renderModal({
      state: makeState({ loaded: true, data: watchLiveData }),
    });
    expect(
      container.querySelector(".watch-live-modal-loading")
    ).not.toBeInTheDocument();
    // 2 your_region rows; other_regions is collapsed by default.
    expect(container.querySelectorAll(".watch-live-modal-row")).toHaveLength(2);
  });

  it("dispatches WATCH_LIVE_REQUEST when opened", () => {
    const dispatch = jest.fn();
    renderModal({ state: makeState(), dispatch });
    const requests = dispatch.mock.calls
      .map(([action]) => action)
      .filter(a => a.type === at.WIDGETS_SPORTS_WATCH_LIVE_REQUEST);
    expect(requests).toHaveLength(1);
  });

  describe("telemetry", () => {
    it("fires an open user event on mount with widget_source, action_value, and widget_size", () => {
      const dispatch = jest.fn();
      renderModal({ state: makeState(), dispatch, widgetSize: "large" });
      const opens = findUserEvents(dispatch, "open");
      expect(opens).toHaveLength(1);
      expect(opens[0].data).toMatchObject({
        widget_name: "sports",
        widget_source: "widget",
        user_action: "open",
        action_value: "watch_live_modal",
        widget_size: "large",
      });
      expect(opens[0].meta).toEqual(
        expect.objectContaining({
          to: "ActivityStream:Main",
          skipLocal: true,
        })
      );
    });

    it("fires a dismiss user event on backdrop click", () => {
      const dispatch = jest.fn();
      const { container } = renderModal({ state: makeState(), dispatch });
      fireEvent.click(container.querySelector(".watch-live-modal-dialog"));
      const dismisses = findUserEvents(dispatch, "dismiss");
      expect(dismisses).toHaveLength(1);
      expect(dismisses[0].data).toMatchObject({
        widget_name: "sports",
        widget_source: "widget",
        action_value: "watch_live_modal",
      });
    });

    it("fires a dismiss user event on Escape (dialog cancel)", () => {
      const dispatch = jest.fn();
      const { container } = renderModal({ state: makeState(), dispatch });
      fireEvent(
        container.querySelector(".watch-live-modal-dialog"),
        new Event("cancel", { bubbles: true, cancelable: true })
      );
      expect(findUserEvents(dispatch, "dismiss")).toHaveLength(1);
    });

    it("fires a dismiss user event on close-button click", () => {
      const dispatch = jest.fn();
      const { container } = renderModal({ state: makeState(), dispatch });
      fireEvent.click(container.querySelector(".watch-live-modal-close"));
      expect(findUserEvents(dispatch, "dismiss")).toHaveLength(1);
    });

    it("fires a stream_click user event with action_value=product_name on stream link click", () => {
      const dispatch = jest.fn();
      const { container } = renderModal({
        state: makeState({ loaded: true, data: watchLiveData }),
        dispatch,
      });
      const tubiLink = container.querySelector(
        ".watch-live-modal-row .watch-live-modal-row-link"
      );
      fireEvent.click(tubiLink);
      const clicks = findUserEvents(dispatch, "stream_click");
      expect(clicks).toHaveLength(1);
      expect(clicks[0].data).toMatchObject({
        widget_name: "sports",
        widget_source: "widget",
        action_value: "Tubi",
      });
    });
  });

  it("opens stream links in a new tab with a safe rel", () => {
    const { container } = renderModal({
      state: makeState({ loaded: true, data: watchLiveData }),
    });
    const links = container.querySelectorAll(".watch-live-modal-row-link");
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("does not render a navigable href for a non-http(s) stream url", () => {
    const { container } = renderModal({
      state: makeState({
        loaded: true,
        data: {
          your_region: [
            {
              product_name: "Sketchy",
              entitlement: "Free",
              // eslint-disable-next-line no-script-url
              url: "javascript:alert(1)",
            },
          ],
        },
      }),
    });
    const link = container.querySelector(".watch-live-modal-row-link");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("");
  });

  describe("entitlement label mapping", () => {
    it("maps a known entitlement string (case-insensitive) to a Fluent id", () => {
      const { container } = renderModal({
        state: makeState({ loaded: true, data: watchLiveData }),
      });
      // "Free and Paid" → free-paid id; "Free" → free id. Confirm one with
      // mixed case made it through the lowercase lookup.
      const free = container.querySelector(
        "[data-l10n-id='newtab-sports-widget-watch-stream-free']"
      );
      expect(free).toBeInTheDocument();
      // Literal stays inside as Fluent's fallback content.
      expect(free.textContent).toBe("Free");
    });

    it("renders the raw entitlement string when no map entry exists", () => {
      const { container } = renderModal({
        state: makeState({ loaded: true, data: watchLiveData }),
      });
      const entitlements = container.querySelectorAll(
        ".watch-live-modal-entitlement"
      );
      const fifa = Array.from(entitlements).find(
        el => el.textContent === "FIFA+"
      );
      expect(fifa).toBeTruthy();
      expect(fifa.hasAttribute("data-l10n-id")).toBe(false);
    });
  });

  describe("dismissal", () => {
    it("calls onClose when the backdrop (the dialog itself) is clicked", () => {
      const onClose = jest.fn();
      const { container } = renderModal({ state: makeState(), onClose });
      fireEvent.click(container.querySelector(".watch-live-modal-dialog"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose for clicks on inner content", () => {
      const onClose = jest.fn();
      const { container } = renderModal({ state: makeState(), onClose });
      fireEvent.click(container.querySelector(".watch-live-modal-content"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose on the dialog cancel event (Escape)", () => {
      const onClose = jest.fn();
      const { container } = renderModal({ state: makeState(), onClose });
      const dialog = container.querySelector(".watch-live-modal-dialog");
      fireEvent(
        dialog,
        new Event("cancel", { bubbles: true, cancelable: true })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("other regions toggle", () => {
    it("starts collapsed with aria-expanded=false and no other-regions section", () => {
      const { container } = renderModal({
        state: makeState({ loaded: true, data: watchLiveData }),
      });
      const toggle = container.querySelector(
        ".watch-live-modal-other-regions-toggle"
      );
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(
        container.querySelector(".watch-live-modal-other-regions")
      ).not.toBeInTheDocument();
    });

    it("expands to show other-regions content on click", () => {
      const { container } = renderModal({
        state: makeState({ loaded: true, data: watchLiveData }),
      });
      const toggle = container.querySelector(
        ".watch-live-modal-other-regions-toggle"
      );
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(
        container.querySelector(".watch-live-modal-other-regions")
      ).toBeInTheDocument();
      // 2 your_region rows + 1 CAN row in other_regions.
      expect(container.querySelectorAll(".watch-live-modal-row")).toHaveLength(
        3
      );
    });
  });
});
