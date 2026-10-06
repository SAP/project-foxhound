/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { fireEvent, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { actionTypes as at } from "common/Actions.mjs";
import {
  SportsMatchRow,
  UpcomingMatchPlaceholder,
} from "content-src/components/Widgets/SportsWidget/SportsMatchRow";

const baseMatch = {
  home_team: { key: "ENG", name: "England" },
  away_team: { key: "USA", name: "United States" },
  date: "2026-05-08T14:00:00+00:00",
  status_type: null,
  home_score: 1,
  away_score: 0,
  home_extra: null,
  away_extra: null,
  home_penalty: null,
  away_penalty: null,
  query: "England vs United States",
};

// SportsMatchRow uses `useDispatch` and `useSelector`, which need a
// Provider context. We give it a fake store whose `dispatch` is a jest
// mock so we can assert on what got dispatched when a user clicks a row.
// The fake state surfaces the widgets.sportsWidget.size pref because the
// row reads it for telemetry.
function renderWithDispatch(ui, { widgetSize = "large" } = {}) {
  const dispatch = jest.fn();
  const store = {
    getState: () => ({
      Prefs: { values: { "widgets.sportsWidget.size": widgetSize } },
    }),
    subscribe: () => () => {},
    dispatch,
  };
  const result = render(<Provider store={store}>{ui}</Provider>);
  return { ...result, dispatch };
}

describe("<SportsMatchRow> upcoming variant", () => {
  it("renders home and away team codes", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    const codes = container.querySelectorAll(".sports-match-code");
    expect(codes[0].textContent).toBe("ENG");
    expect(codes[1].textContent).toBe("USA");
  });

  it("renders match time element", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-time']"
      )
    ).toBeInTheDocument();
  });

  it("renders match date when no special status", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    expect(
      container.querySelector("[data-l10n-id='newtab-sports-widget-key-date']")
    ).toBeInTheDocument();
  });

  it("renders status label instead of date for a special status", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, status_type: "postponed" }}
        variant="upcoming"
      />
    );
    expect(
      container.querySelector("[data-l10n-id='newtab-sports-widget-postponed']")
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-l10n-id='newtab-sports-widget-key-date']")
    ).not.toBeInTheDocument();
  });

  it("accepts the American spelling 'canceled' from the API and renders the Cancelled badge", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, status_type: "Canceled" }}
        variant="upcoming"
      />
    );
    expect(
      container.querySelector("[data-l10n-id='newtab-sports-widget-cancelled']")
    ).toBeInTheDocument();
  });
});

describe("<SportsMatchRow> now variant", () => {
  it("renders home and away scores including extra time", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{
          ...baseMatch,
          home_score: 1,
          away_score: 0,
          home_extra: 1,
          away_extra: 0,
        }}
        variant="now"
      />
    );
    expect(container.querySelector(".sports-score-home").textContent).toBe("2");
    expect(container.querySelector(".sports-score-away").textContent).toBe("0");
  });

  it.each([
    ["Halftime", "newtab-sports-widget-match-halftime"],
    ["Extra time", "newtab-sports-widget-match-extra-time"],
  ])(
    "renders the localised live status label when status_type is %s",
    (statusType, expectedL10nId) => {
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{ ...baseMatch, status_type: statusType }}
          variant="now"
        />
      );
      expect(
        container.querySelector(`[data-l10n-id='${expectedL10nId}']`)
      ).toBeInTheDocument();
    }
  );

  it.each(["live", "In Progress", null])(
    "renders no live status footer when status_type is %s (no mapped FTL id)",
    statusType => {
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{ ...baseMatch, status_type: statusType }}
          variant="now"
        />
      );
      expect(
        container.querySelector(".sports-match-live-footer")
      ).not.toBeInTheDocument();
    }
  );
});

describe("<SportsMatchRow> results variant", () => {
  it("renders home and away scores including extra time", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{
          ...baseMatch,
          home_score: 1,
          away_score: 0,
          home_extra: 1,
          away_extra: 0,
        }}
        variant="results"
      />
    );
    expect(container.querySelector(".sports-score-home").textContent).toBe("2");
    expect(container.querySelector(".sports-score-away").textContent).toBe("0");
  });

  it("renders the Full time FTL footer when status_type is Final", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, status_type: "Final" }}
        variant="results"
      />
    );
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-full-time']"
      )
    ).toBeInTheDocument();
  });

  it("defaults to the Full time FTL footer when status_type is an unmapped finished-state value", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, status_type: "Final - Shoot Out" }}
        variant="results"
      />
    );
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-full-time']"
      )
    ).toBeInTheDocument();
    const footer = container.querySelector(".sports-match-result-footer");
    expect(footer.textContent).not.toContain("Final - Shoot Out");
  });

  it("defaults to the Full time FTL footer when a live-state match leaks into the Results bucket", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, status_type: "live" }}
        variant="results"
      />
    );
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-full-time']"
      )
    ).toBeInTheDocument();
    const footer = container.querySelector(".sports-match-result-footer");
    expect(footer.textContent).not.toContain("live");
  });

  it("defaults to the Full time FTL footer when status_type is null", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, status_type: null }}
        variant="results"
      />
    );
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-full-time']"
      )
    ).toBeInTheDocument();
  });

  it("renders penalty scores and footer text when penalties are present", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, home_penalty: 4, away_penalty: 3 }}
        variant="results"
      />
    );
    const penalties = container.querySelectorAll(".sports-score-penalty");
    expect(penalties[0].textContent).toBe("(4)");
    expect(penalties[1].textContent).toBe("(3)");
    // Full time default still renders alongside the penalties footer.
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-full-time']"
      )
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-penalties']"
      )
    ).toBeInTheDocument();
  });

  it("does not render the penalties footer label for list-size rows", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, home_penalty: 4, away_penalty: 3 }}
        variant="results"
        size="list"
      />
    );
    // Penalty scores still render inside the score pill.
    expect(container.querySelectorAll(".sports-score-penalty")).toHaveLength(2);
    // The footer label is suppressed in list view.
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-penalties']"
      )
    ).not.toBeInTheDocument();
  });

  it("does not render penalty elements when no penalties", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="results" />
    );
    expect(container.querySelectorAll(".sports-score-penalty")).toHaveLength(0);
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-match-penalties']"
      )
    ).not.toBeInTheDocument();
  });
});

describe("<SportsMatchRow> aria-label l10n", () => {
  function getAnchorL10n(container) {
    const anchor = container.querySelector("a.sports-match-row");
    return {
      id: anchor.getAttribute("data-l10n-id"),
      args: JSON.parse(anchor.getAttribute("data-l10n-args")),
    };
  }

  describe("results variant", () => {
    it("uses the results l10n id for a normal full-time result", () => {
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{ ...baseMatch, home_score: 3, away_score: 2 }}
          variant="results"
        />
      );
      const { id, args } = getAnchorL10n(container);
      expect(id).toBe("newtab-sports-widget-match-aria-label-results");
      expect(args).toEqual({
        homeTeam: "England",
        awayTeam: "United States",
        homeScore: 3,
        awayScore: 2,
      });
    });

    it("uses the results-penalties l10n id and includes penalty scores when the match went to a shootout", () => {
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{
            ...baseMatch,
            home_score: 3,
            away_score: 3,
            home_penalty: 5,
            away_penalty: 4,
          }}
          variant="results"
        />
      );
      const { id, args } = getAnchorL10n(container);
      expect(id).toBe(
        "newtab-sports-widget-match-aria-label-results-penalties"
      );
      expect(args.homePenalty).toBe(5);
      expect(args.awayPenalty).toBe(4);
    });

    it("adds extra-time goals into the announced scores", () => {
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{
            ...baseMatch,
            home_score: 2,
            away_score: 1,
            home_extra: 1,
            away_extra: 0,
          }}
          variant="results"
        />
      );
      const { args } = getAnchorL10n(container);
      expect(args.homeScore).toBe(3);
      expect(args.awayScore).toBe(1);
    });

    it("treats home_penalty === 0 as a real shootout value, not a missing one", () => {
      // Guards against a regression where a falsy check on home_penalty
      // would route a 0-goal shootout to the non-penalties ID.
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{
            ...baseMatch,
            home_score: 1,
            away_score: 1,
            home_penalty: 0,
            away_penalty: 3,
          }}
          variant="results"
        />
      );
      const { id, args } = getAnchorL10n(container);
      expect(id).toBe(
        "newtab-sports-widget-match-aria-label-results-penalties"
      );
      expect(args.homePenalty).toBe(0);
      expect(args.awayPenalty).toBe(3);
    });
  });

  describe("now variant", () => {
    it("uses the now l10n id with the current score", () => {
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{ ...baseMatch, home_score: 1, away_score: 0 }}
          variant="now"
        />
      );
      const { id, args } = getAnchorL10n(container);
      expect(id).toBe("newtab-sports-widget-match-aria-label-now");
      expect(args).toEqual(
        expect.objectContaining({
          homeTeam: "England",
          awayTeam: "United States",
          homeScore: 1,
          awayScore: 0,
        })
      );
    });
  });

  describe("upcoming variant", () => {
    it("uses the upcoming l10n id and passes the date timestamp for a scheduled match", () => {
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{ ...baseMatch, status_type: "scheduled" }}
          variant="upcoming"
        />
      );
      const { id, args } = getAnchorL10n(container);
      expect(id).toBe("newtab-sports-widget-match-aria-label-upcoming");
      expect(args.date).toBe(new Date(baseMatch.date).getTime());
    });

    it("falls back to the upcoming (scheduled) l10n id when status_type is missing", () => {
      // Defensive: API can omit status_type; the default scheduled string
      // must still be picked.
      const { container } = renderWithDispatch(
        <SportsMatchRow
          match={{ ...baseMatch, status_type: null }}
          variant="upcoming"
        />
      );
      expect(getAnchorL10n(container).id).toBe(
        "newtab-sports-widget-match-aria-label-upcoming"
      );
    });

    it.each([
      ["delayed", "newtab-sports-widget-match-aria-label-upcoming-delayed"],
      ["postponed", "newtab-sports-widget-match-aria-label-upcoming-postponed"],
      ["suspended", "newtab-sports-widget-match-aria-label-upcoming-suspended"],
      ["cancelled", "newtab-sports-widget-match-aria-label-upcoming-cancelled"],
      ["canceled", "newtab-sports-widget-match-aria-label-upcoming-cancelled"],
    ])(
      "picks the matching per-status l10n id when status_type is %s",
      (statusType, expectedId) => {
        const { container } = renderWithDispatch(
          <SportsMatchRow
            match={{ ...baseMatch, status_type: statusType }}
            variant="upcoming"
          />
        );
        expect(getAnchorL10n(container).id).toBe(expectedId);
      }
    );
  });
});

describe("<SportsMatchRow> click handling", () => {
  it.each(["upcoming", "results", "now"])(
    "dispatches a newtab telemetry event and the open-search action on click (variant=%s)",
    variant => {
      const { container, dispatch } = renderWithDispatch(
        <SportsMatchRow match={baseMatch} variant={variant} />,
        { widgetSize: "medium" }
      );

      fireEvent.click(container.querySelector("a.sports-match-row"));

      expect(dispatch).toHaveBeenCalledTimes(2);
      const [[userEvent], [openSearch]] = dispatch.mock.calls;

      expect(userEvent).toMatchObject({
        type: at.WIDGETS_USER_EVENT,
        data: {
          widget_name: "sports",
          widget_source: "widget",
          user_action: "open_match_search",
          action_value: variant,
          widget_size: "medium",
        },
      });

      expect(openSearch).toMatchObject({
        type: at.WIDGETS_SPORTS_OPEN_MATCH_SEARCH,
        data: {
          query: baseMatch.query,
          eventInfo: expect.objectContaining({ button: 0 }),
        },
      });
    }
  );

  it("propagates modifier key state in the dispatched eventInfo", () => {
    const { container, dispatch } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );

    fireEvent.click(container.querySelector("a.sports-match-row"), {
      metaKey: true,
      shiftKey: true,
    });

    // calls[0] is the USER_EVENT; calls[1] is the OPEN_MATCH_SEARCH action
    // whose eventInfo carries the modifier state.
    const [, [openSearch]] = dispatch.mock.calls;
    expect(openSearch.data.eventInfo).toMatchObject({
      metaKey: true,
      shiftKey: true,
      button: 0,
    });
  });

  it("treats Enter and Space key presses as activation", () => {
    // Anchors without href don't fire click on Enter/Space natively, so the
    // component wires keyboard activation up manually. Each activation
    // produces two dispatches (USER_EVENT + OPEN_MATCH_SEARCH).
    const { container, dispatch } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );

    const anchor = container.querySelector("a.sports-match-row");
    fireEvent.keyDown(anchor, { key: "Enter" });
    fireEvent.keyDown(anchor, { key: " " });

    expect(dispatch).toHaveBeenCalledTimes(4);
    expect(dispatch.mock.calls[0][0].type).toBe(at.WIDGETS_USER_EVENT);
    expect(dispatch.mock.calls[1][0].type).toBe(
      at.WIDGETS_SPORTS_OPEN_MATCH_SEARCH
    );
    expect(dispatch.mock.calls[2][0].type).toBe(at.WIDGETS_USER_EVENT);
    expect(dispatch.mock.calls[3][0].type).toBe(
      at.WIDGETS_SPORTS_OPEN_MATCH_SEARCH
    );
  });

  it("does not dispatch when the match has no query", () => {
    const { container, dispatch } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, query: undefined }}
        variant="upcoming"
      />
    );

    fireEvent.click(container.querySelector("a.sports-match-row"));

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("calls handleInteraction on click to mark the widget as interacted-with", () => {
    const handleInteraction = jest.fn();
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={baseMatch}
        variant="upcoming"
        handleInteraction={handleInteraction}
      />
    );

    fireEvent.click(container.querySelector("a.sports-match-row"));

    expect(handleInteraction).toHaveBeenCalledTimes(1);
  });

  it("does not call handleInteraction when the match has no query", () => {
    const handleInteraction = jest.fn();
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, query: undefined }}
        variant="upcoming"
        handleInteraction={handleInteraction}
      />
    );

    fireEvent.click(container.querySelector("a.sports-match-row"));

    expect(handleInteraction).not.toHaveBeenCalled();
  });

  it("applies link semantics only when the match has a query", () => {
    // With a query: the row claims a link role and is in the tab order.
    const { container: withQuery } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    const clickableAnchor = withQuery.querySelector("a.sports-match-row");
    expect(clickableAnchor).toHaveAttribute("tabindex", "0");
    expect(clickableAnchor).toHaveAttribute("role", "link");
    expect(clickableAnchor.className).toContain("clickable");

    // Without a query: no role, no tabindex, no `clickable` class — the
    // anchor is an inert wrapper so AT doesn't announce a phantom link.
    const { container: noQuery } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...baseMatch, query: undefined }}
        variant="upcoming"
      />
    );
    const inertAnchor = noQuery.querySelector("a.sports-match-row");
    expect(inertAnchor).not.toHaveAttribute("tabindex");
    expect(inertAnchor).not.toHaveAttribute("role");
    expect(inertAnchor.className).not.toContain("clickable");
  });
});

describe("<SportsMatchRow> followed teams", () => {
  function getFlagWrappers(container) {
    return container.querySelectorAll(".sports-match-flag-wrapper");
  }
  function getCodes(container) {
    return container.querySelectorAll(".sports-match-code");
  }

  it("does not mark either side as followed when followedTeams is undefined", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    const wrappers = getFlagWrappers(container);
    expect(wrappers[0].classList.contains("is-followed")).toBe(false);
    expect(wrappers[1].classList.contains("is-followed")).toBe(false);
    expect(container.querySelectorAll(".sports-match-flag-check")).toHaveLength(
      0
    );
    const codes = getCodes(container);
    expect(codes[0].querySelector("strong")).toBeNull();
    expect(codes[1].querySelector("strong")).toBeNull();
  });

  it("marks only the home side when only the home team is followed", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={baseMatch}
        variant="upcoming"
        followedTeams={new Set(["ENG"])}
      />
    );
    const wrappers = getFlagWrappers(container);
    expect(wrappers[0].classList.contains("is-followed")).toBe(true);
    expect(wrappers[1].classList.contains("is-followed")).toBe(false);
    const checks = container.querySelectorAll(".sports-match-flag-check");
    expect(checks).toHaveLength(1);
    expect(wrappers[0].querySelector(".sports-match-flag-check")).toBeTruthy();
    const codes = getCodes(container);
    expect(codes[0].querySelector("strong").textContent).toBe("ENG");
    expect(codes[1].querySelector("strong")).toBeNull();
  });

  it("marks only the away side when only the away team is followed", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={baseMatch}
        variant="results"
        followedTeams={new Set(["USA"])}
      />
    );
    const wrappers = getFlagWrappers(container);
    expect(wrappers[0].classList.contains("is-followed")).toBe(false);
    expect(wrappers[1].classList.contains("is-followed")).toBe(true);
    expect(wrappers[1].querySelector(".sports-match-flag-check")).toBeTruthy();
    const codes = getCodes(container);
    expect(codes[0].querySelector("strong")).toBeNull();
    expect(codes[1].querySelector("strong").textContent).toBe("USA");
  });

  it("marks both sides when both teams are followed", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={baseMatch}
        variant="now"
        followedTeams={new Set(["ENG", "USA"])}
      />
    );
    const wrappers = getFlagWrappers(container);
    expect(wrappers[0].classList.contains("is-followed")).toBe(true);
    expect(wrappers[1].classList.contains("is-followed")).toBe(true);
    expect(container.querySelectorAll(".sports-match-flag-check")).toHaveLength(
      2
    );
  });

  it("hides the check badge from assistive technology", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={baseMatch}
        variant="upcoming"
        followedTeams={new Set(["ENG"])}
      />
    );
    expect(
      container
        .querySelector(".sports-match-flag-check")
        .getAttribute("aria-hidden")
    ).toBe("true");
  });
});

describe("<SportsMatchRow> flag accessibility", () => {
  it("sets alt and title on the home team flag image to the team name", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    const flags = container.querySelectorAll(".sports-match-flag");
    expect(flags[0].getAttribute("alt")).toBe("England");
    expect(flags[0].getAttribute("title")).toBe("England");
  });

  it("sets alt and title on the away team flag image to the team name", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    const flags = container.querySelectorAll(".sports-match-flag");
    expect(flags[1].getAttribute("alt")).toBe("United States");
    expect(flags[1].getAttribute("title")).toBe("United States");
  });

  it("does not set title on the parent .sports-match-team div", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={baseMatch} variant="upcoming" />
    );
    const teamDivs = container.querySelectorAll(".sports-match-team");
    expect(teamDivs[0].getAttribute("title")).toBeNull();
    expect(teamDivs[1].getAttribute("title")).toBeNull();
  });
});

describe("<SportsMatchRow> undecided (TBD) teams", () => {
  // A knockout fixture whose teams aren't decided yet: the backend sends
  // home_team/away_team as null but still provides a query and stage.
  const tbdMatch = {
    ...baseMatch,
    home_team: null,
    away_team: null,
    status_type: "scheduled",
    query: "Quarter-finals World Cup 2026",
  };

  it("renders a placeholder rectangle and '--' for each undecided team", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow match={tbdMatch} variant="upcoming" />
    );
    // Placeholder spans stand in for the flag images, which are absent.
    expect(container.querySelectorAll(".sports-match-flag-tbd")).toHaveLength(
      2
    );
    expect(container.querySelectorAll("img.sports-match-flag")).toHaveLength(0);
    const codes = container.querySelectorAll(".sports-match-code");
    expect(codes[0].textContent).toBe("--");
    expect(codes[1].textContent).toBe("--");
  });

  it("renders a real team on the decided side and a placeholder on the other", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...tbdMatch, home_team: { key: "ENG", name: "England" } }}
        variant="upcoming"
      />
    );
    const flags = container.querySelectorAll("img.sports-match-flag");
    expect(flags).toHaveLength(1);
    expect(flags[0].getAttribute("alt")).toBe("England");
    expect(container.querySelectorAll(".sports-match-flag-tbd")).toHaveLength(
      1
    );
    const codes = container.querySelectorAll(".sports-match-code");
    expect(codes[0].textContent).toBe("ENG");
    expect(codes[1].textContent).toBe("--");
  });

  it("substitutes the tbdTeamName prop for an undecided team in the aria-label", () => {
    const { container } = renderWithDispatch(
      <SportsMatchRow
        match={{ ...tbdMatch, home_team: { key: "ENG", name: "England" } }}
        variant="upcoming"
        tbdTeamName="To be determined"
      />
    );
    const args = JSON.parse(
      container
        .querySelector("a.sports-match-row")
        .getAttribute("data-l10n-args")
    );
    expect(args.homeTeam).toBe("England");
    expect(args.awayTeam).toBe("To be determined");
  });
});

describe("<UpcomingMatchPlaceholder>", () => {
  it("renders two placeholder tiles with '--' and a vs separator", () => {
    const { container } = render(<UpcomingMatchPlaceholder size="large" />);
    expect(container.querySelectorAll(".sports-match-flag-tbd")).toHaveLength(
      2
    );
    expect(container.querySelectorAll("img.sports-match-flag")).toHaveLength(0);
    const codes = container.querySelectorAll(".sports-match-code");
    expect(codes[0].textContent).toBe("--");
    expect(codes[1].textContent).toBe("--");
    expect(
      container.querySelector("[data-l10n-id='newtab-sports-widget-match-vs']")
    ).toBeInTheDocument();
  });

  it("shows the 'no upcoming matches' note at the large size", () => {
    const { container } = render(<UpcomingMatchPlaceholder size="large" />);
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-no-upcoming-matches']"
      )
    ).toBeInTheDocument();
  });

  it("hides the note at non-large sizes", () => {
    const { container } = render(<UpcomingMatchPlaceholder size="medium" />);
    expect(
      container.querySelector(
        "[data-l10n-id='newtab-sports-widget-no-upcoming-matches']"
      )
    ).not.toBeInTheDocument();
  });
});
