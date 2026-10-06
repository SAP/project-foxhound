/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { act, fireEvent, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { combineReducers, createStore } from "redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import {
  LOGO_VARIATIONS,
  Logo,
  PREF_LOGO_VARIATION,
  pickVariant,
} from "content-src/components/Logo/Logo";

function renderWithPrefs(node, prefOverrides = {}) {
  const state = {
    ...INITIAL_STATE,
    Prefs: {
      ...INITIAL_STATE.Prefs,
      values: {
        ...INITIAL_STATE.Prefs.values,
        // All variation tests assume the Sports Widget is enabled; the
        // logo variations are gated on it in Logo.jsx via
        // `isWidgetEnabled(sportsWidget, prefs, widgetsEnabled)`, which
        // requires the widgets master toggle, the system-side enabled
        // pref, and the per-widget user pref all to be truthy.
        // Individual tests can override via `prefOverrides`.
        "widgets.enabled": true,
        "widgets.system.sportsWidget.enabled": true,
        "widgets.sportsWidget.enabled": true,
        ...prefOverrides,
      },
    },
  };
  const store = createStore(combineReducers(reducers), state);
  return render(<Provider store={store}>{node}</Provider>);
}

function setMatchMediaMock({ reduceMotion = false } = {}) {
  globalThis.matchMedia = query => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? reduceMotion : true,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
}

describe("<Logo>", () => {
  let originalMatchMedia;
  let originalDir;

  beforeEach(() => {
    originalMatchMedia = globalThis.matchMedia;
    originalDir = document.dir;
    setMatchMediaMock();
    document.dir = "ltr";
  });

  afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
    document.dir = originalDir;
  });

  it("renders the standard logo wrapper", () => {
    const { container } = renderWithPrefs(<Logo />);
    expect(
      container.querySelector("h1.logo-and-wordmark-wrapper")
    ).toBeInTheDocument();
    expect(
      container.querySelector("div.logo-and-wordmark")
    ).toBeInTheDocument();
    expect(container.querySelector("div.wordmark")).toBeInTheDocument();
  });

  it("renders the default logo when no variation is configured", () => {
    const { container } = renderWithPrefs(<Logo />);
    expect(container.querySelector("div.logo")).toBeInTheDocument();
    expect(container.querySelector(".spin-ball-small")).not.toBeInTheDocument();
    expect(container.querySelector(".spin-smooth")).not.toBeInTheDocument();
  });

  // @backward-compat { version 153 }
  // The describe block below can be removed after Firefox 153 hits Release.
  describe("logo variation selection", () => {
    it("renders SpinBallSmall when trainhopConfig.logo.variation is set", () => {
      const { container } = renderWithPrefs(<Logo />, {
        trainhopConfig: { logo: { variation: "spin-ball-small" } },
      });
      expect(container.querySelector(".spin-ball-small")).toBeInTheDocument();
      expect(container.querySelector("div.logo")).not.toBeInTheDocument();
    });

    it("renders SpinBallSmall when PREF_LOGO_VARIATION is set", () => {
      const { container } = renderWithPrefs(<Logo />, {
        [PREF_LOGO_VARIATION]: "spin-ball-small",
      });
      expect(container.querySelector(".spin-ball-small")).toBeInTheDocument();
      expect(container.querySelector("div.logo")).not.toBeInTheDocument();
    });

    it("renders SpinSmooth when PREF_LOGO_VARIATION is 'spin-smooth'", () => {
      const { container } = renderWithPrefs(<Logo />, {
        [PREF_LOGO_VARIATION]: "spin-smooth",
      });
      expect(container.querySelector(".spin-smooth")).toBeInTheDocument();
      expect(container.querySelector("div.logo")).not.toBeInTheDocument();
    });

    it("prefers trainhopConfig over PREF_LOGO_VARIATION", () => {
      const { container } = renderWithPrefs(<Logo />, {
        trainhopConfig: { logo: { variation: "spin-ball-small" } },
        [PREF_LOGO_VARIATION]: "this-id-does-not-exist",
      });
      expect(container.querySelector(".spin-ball-small")).toBeInTheDocument();
    });

    it("falls back to the pref when trainhopConfig is empty string", () => {
      const { container } = renderWithPrefs(<Logo />, {
        trainhopConfig: { logo: { variation: "" } },
        [PREF_LOGO_VARIATION]: "spin-ball-small",
      });
      expect(container.querySelector(".spin-ball-small")).toBeInTheDocument();
    });

    it("falls back to default logo when variation ID is unknown", () => {
      const { container } = renderWithPrefs(<Logo />, {
        [PREF_LOGO_VARIATION]: "this-id-does-not-exist",
      });
      expect(container.querySelector("div.logo")).toBeInTheDocument();
      expect(
        container.querySelector(".spin-ball-small")
      ).not.toBeInTheDocument();
    });

    it("falls back to default logo when the Sports Widget is disabled, regardless of variation", () => {
      const { container } = renderWithPrefs(<Logo />, {
        trainhopConfig: { logo: { variation: "spin-ball-small" } },
        "widgets.sportsWidget.enabled": false,
      });
      expect(container.querySelector("div.logo")).toBeInTheDocument();
      expect(
        container.querySelector(".spin-ball-small")
      ).not.toBeInTheDocument();
    });

    it("still renders the variation when prefers-reduced-motion: reduce (motion is suppressed at click time, not in selection)", () => {
      setMatchMediaMock({ reduceMotion: true });
      const { container } = renderWithPrefs(<Logo />, {
        trainhopConfig: { logo: { variation: "spin-ball-small" } },
      });
      expect(container.querySelector(".spin-ball-small")).toBeInTheDocument();
      expect(container.querySelector("div.logo")).not.toBeInTheDocument();
    });
  });
});

// @backward-compat { version 153 }
// All of the describe blocks below can be removed after Firefox 153 hits
// Release.
describe("pickVariant", () => {
  const env = { viewportWidth: 1920, isLTR: true };

  it("returns null for an empty or null variation ID", () => {
    expect(pickVariant(null, env)).toBeNull();
    expect(pickVariant("", env)).toBeNull();
    expect(pickVariant(undefined, env)).toBeNull();
  });

  it("returns null for an unknown variation ID", () => {
    expect(pickVariant("this-id-does-not-exist", env)).toBeNull();
  });

  it("returns the variation entry when constraints are satisfied", () => {
    expect(pickVariant("spin-ball-small", env)).toBe(
      LOGO_VARIATIONS["spin-ball-small"]
    );
  });

  describe("constraint gating + fallback chain", () => {
    const TEMP_ID = "test-only-temp-variant";
    const HEAD_ID = "test-only-chain-head";
    const TempComponent = () => null;
    const HeadComponent = () => null;

    afterEach(() => {
      delete LOGO_VARIATIONS[TEMP_ID];
      delete LOGO_VARIATIONS[HEAD_ID];
    });

    it("falls back when the width gate fails", () => {
      LOGO_VARIATIONS[TEMP_ID] = {
        component: TempComponent,
        minViewportWidth: 5000,
        requiresLTR: false,
        fallback: null,
      };
      expect(
        pickVariant(TEMP_ID, { viewportWidth: 1024, isLTR: true })
      ).toBeNull();
    });

    it("falls back when an LTR-required variation is rendered RTL", () => {
      LOGO_VARIATIONS[TEMP_ID] = {
        component: TempComponent,
        minViewportWidth: 0,
        requiresLTR: true,
        fallback: null,
      };
      expect(
        pickVariant(TEMP_ID, { viewportWidth: 1024, isLTR: false })
      ).toBeNull();
    });

    it("walks the fallback chain to a satisfying variation", () => {
      LOGO_VARIATIONS[HEAD_ID] = {
        component: HeadComponent,
        minViewportWidth: 5000,
        requiresLTR: false,
        fallback: "spin-ball-small",
      };
      expect(pickVariant(HEAD_ID, { viewportWidth: 1024, isLTR: true })).toBe(
        LOGO_VARIATIONS["spin-ball-small"]
      );
    });

    it("terminates on cycles without infinite-looping", () => {
      LOGO_VARIATIONS[TEMP_ID] = {
        component: TempComponent,
        minViewportWidth: 5000,
        requiresLTR: false,
        fallback: HEAD_ID,
      };
      LOGO_VARIATIONS[HEAD_ID] = {
        component: HeadComponent,
        minViewportWidth: 5000,
        requiresLTR: false,
        fallback: TEMP_ID,
      };
      expect(
        pickVariant(HEAD_ID, { viewportWidth: 1024, isLTR: true })
      ).toBeNull();
    });
  });
});

describe("<SpinBallSmall>", () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = globalThis.matchMedia;
    setMatchMediaMock();
  });

  afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
  });

  function renderSpinBallSmall() {
    return renderWithPrefs(<Logo />, {
      [PREF_LOGO_VARIATION]: "spin-ball-small",
    });
  }

  it("renders an aria-hidden SVG with the shared and variation classes", () => {
    const { container } = renderSpinBallSmall();
    const svg = container.querySelector("svg.spin-ball-small");
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.classList.contains("logo-variation-small")).toBe(true);
  });

  it("plays animations on first click, resetting currentTime to 0", () => {
    const { container } = renderSpinBallSmall();
    const svg = container.querySelector("svg.spin-ball-small");
    const anim = { playState: "paused", play: jest.fn(), currentTime: 999 };
    svg.getAnimations = jest.fn().mockReturnValue([anim]);

    fireEvent.click(svg);

    expect(anim.currentTime).toBe(0);
    expect(anim.play).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while animations are running", () => {
    const { container } = renderSpinBallSmall();
    const svg = container.querySelector("svg.spin-ball-small");
    const anim = { playState: "running", play: jest.fn(), currentTime: 1.5 };
    svg.getAnimations = jest.fn().mockReturnValue([anim]);

    fireEvent.click(svg);

    expect(anim.play).not.toHaveBeenCalled();
    expect(anim.currentTime).toBe(1.5);
  });

  it("restarts animations on click after they finish", () => {
    const { container } = renderSpinBallSmall();
    const svg = container.querySelector("svg.spin-ball-small");
    const anim = { playState: "finished", play: jest.fn(), currentTime: 5.03 };
    svg.getAnimations = jest.fn().mockReturnValue([anim]);

    fireEvent.click(svg);

    expect(anim.currentTime).toBe(0);
    expect(anim.play).toHaveBeenCalledTimes(1);
  });

  it("does nothing when getAnimations returns an empty list", () => {
    const { container } = renderSpinBallSmall();
    const svg = container.querySelector("svg.spin-ball-small");
    svg.getAnimations = jest.fn().mockReturnValue([]);

    expect(() => fireEvent.click(svg)).not.toThrow();
  });

  it("does not play animations when prefers-reduced-motion is set, but stays clickable", () => {
    setMatchMediaMock({ reduceMotion: true });
    const { container } = renderSpinBallSmall();
    const svg = container.querySelector("svg.spin-ball-small");
    const anim = { playState: "paused", play: jest.fn(), currentTime: 0 };
    svg.getAnimations = jest.fn().mockReturnValue([anim]);

    expect(() => fireEvent.click(svg)).not.toThrow();
    expect(anim.play).not.toHaveBeenCalled();
  });

  it("applies .is-animating while CSS animations are running", () => {
    const { container } = renderSpinBallSmall();
    const svg = container.querySelector("svg.spin-ball-small");

    expect(svg.classList.contains("is-animating")).toBe(false);

    act(() => {
      svg.dispatchEvent(new Event("animationstart", { bubbles: true }));
    });
    expect(svg.classList.contains("is-animating")).toBe(true);

    act(() => {
      svg.dispatchEvent(new Event("animationend", { bubbles: true }));
    });
    expect(svg.classList.contains("is-animating")).toBe(false);
  });
});

// @backward-compat { version 153 }
// Can be removed after Firefox 153 hits Release.
describe("<SpinSmooth>", () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = globalThis.matchMedia;
    setMatchMediaMock();
  });

  afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
  });

  function renderSpinSmooth() {
    return renderWithPrefs(<Logo />, {
      [PREF_LOGO_VARIATION]: "spin-smooth",
    });
  }

  it("renders an aria-hidden SVG with the shared and variation classes", () => {
    const { container } = renderSpinSmooth();
    const svg = container.querySelector("svg.spin-smooth");
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.classList.contains("logo-variation-small")).toBe(true);
  });

  it("renders an animateTransform with begin=indefinite (manual trigger)", () => {
    const { container } = renderSpinSmooth();
    const anim = container.querySelector("animateTransform");
    expect(anim).toBeInTheDocument();
    expect(anim.getAttribute("begin")).toBe("indefinite");
    expect(anim.getAttribute("dur")).toBe("6.67s");
    expect(anim.getAttribute("calcMode")).toBe("discrete");
  });

  it("calls beginElement() on the animation on click", () => {
    const { container } = renderSpinSmooth();
    const svg = container.querySelector("svg.spin-smooth");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    fireEvent.click(svg);

    expect(animNode.beginElement).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while the animation is running", () => {
    const { container } = renderSpinSmooth();
    const svg = container.querySelector("svg.spin-smooth");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    animNode.dispatchEvent(new Event("beginEvent"));
    fireEvent.click(svg);

    expect(animNode.beginElement).not.toHaveBeenCalled();
  });

  it("allows replay after the animation finishes", () => {
    const { container } = renderSpinSmooth();
    const svg = container.querySelector("svg.spin-smooth");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    animNode.dispatchEvent(new Event("beginEvent"));
    animNode.dispatchEvent(new Event("endEvent"));
    fireEvent.click(svg);

    expect(animNode.beginElement).toHaveBeenCalledTimes(1);
  });

  it("does not begin the animation when prefers-reduced-motion is set, but stays clickable", () => {
    setMatchMediaMock({ reduceMotion: true });
    const { container } = renderSpinSmooth();
    const svg = container.querySelector("svg.spin-smooth");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    expect(() => fireEvent.click(svg)).not.toThrow();
    expect(animNode.beginElement).not.toHaveBeenCalled();
  });

  it("applies .is-animating while the SMIL animation is running", () => {
    const { container } = renderSpinSmooth();
    const svg = container.querySelector("svg.spin-smooth");
    const animNode = container.querySelector("animateTransform");

    expect(svg.classList.contains("is-animating")).toBe(false);

    act(() => {
      animNode.dispatchEvent(new Event("beginEvent"));
    });
    expect(svg.classList.contains("is-animating")).toBe(true);

    act(() => {
      animNode.dispatchEvent(new Event("endEvent"));
    });
    expect(svg.classList.contains("is-animating")).toBe(false);
  });
});

// @backward-compat { version 153 }
// Can be removed after Firefox 153 hits Release.
describe("<RotatingBall>", () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = globalThis.matchMedia;
    setMatchMediaMock();
  });

  afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
  });

  function renderRotatingBall() {
    return renderWithPrefs(<Logo />, {
      [PREF_LOGO_VARIATION]: "rotating-ball",
    });
  }

  it("renders an aria-hidden SVG with the shared and variation classes", () => {
    const { container } = renderRotatingBall();
    const svg = container.querySelector("svg.rotating-ball");
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.classList.contains("logo-variation-small")).toBe(true);
  });

  it("renders an animateTransform with begin=indefinite (manual trigger)", () => {
    const { container } = renderRotatingBall();
    const anim = container.querySelector("animateTransform");
    expect(anim).toBeInTheDocument();
    expect(anim.getAttribute("begin")).toBe("indefinite");
    expect(anim.getAttribute("dur")).toBe("2.9333s");
    expect(anim.getAttribute("calcMode")).toBe("discrete");
  });

  it("calls beginElement() on the animation on click", () => {
    const { container } = renderRotatingBall();
    const svg = container.querySelector("svg.rotating-ball");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    fireEvent.click(svg);

    expect(animNode.beginElement).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while the animation is running", () => {
    const { container } = renderRotatingBall();
    const svg = container.querySelector("svg.rotating-ball");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    animNode.dispatchEvent(new Event("beginEvent"));
    fireEvent.click(svg);

    expect(animNode.beginElement).not.toHaveBeenCalled();
  });

  it("allows replay after the animation finishes", () => {
    const { container } = renderRotatingBall();
    const svg = container.querySelector("svg.rotating-ball");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    animNode.dispatchEvent(new Event("beginEvent"));
    animNode.dispatchEvent(new Event("endEvent"));
    fireEvent.click(svg);

    expect(animNode.beginElement).toHaveBeenCalledTimes(1);
  });

  it("does not begin the animation when prefers-reduced-motion is set, but stays clickable", () => {
    setMatchMediaMock({ reduceMotion: true });
    const { container } = renderRotatingBall();
    const svg = container.querySelector("svg.rotating-ball");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    expect(() => fireEvent.click(svg)).not.toThrow();
    expect(animNode.beginElement).not.toHaveBeenCalled();
  });

  it("applies .is-animating while the SMIL animation is running", () => {
    const { container } = renderRotatingBall();
    const svg = container.querySelector("svg.rotating-ball");
    const animNode = container.querySelector("animateTransform");

    expect(svg.classList.contains("is-animating")).toBe(false);

    act(() => {
      animNode.dispatchEvent(new Event("beginEvent"));
    });
    expect(svg.classList.contains("is-animating")).toBe(true);

    act(() => {
      animNode.dispatchEvent(new Event("endEvent"));
    });
    expect(svg.classList.contains("is-animating")).toBe(false);
  });
});

// @backward-compat { version 153 }
// Can be removed after Firefox 153 hits Release.
describe("<FootballBounce>", () => {
  let originalMatchMedia;
  let originalDir;

  beforeEach(() => {
    originalMatchMedia = globalThis.matchMedia;
    originalDir = document.dir;
    setMatchMediaMock();
    document.dir = "ltr";
  });

  afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
    document.dir = originalDir;
  });

  function renderFootballBounce() {
    return renderWithPrefs(<Logo />, {
      [PREF_LOGO_VARIATION]: "football-bounce",
    });
  }

  it("renders a 64x64 container wrapping an aria-hidden sprite SVG", () => {
    const { container } = renderFootballBounce();
    const wrapper = container.querySelector("div.football-bounce");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.classList.contains("logo-variation-small")).toBe(true);
    const svg = wrapper.querySelector("svg.football-bounce__sprite");
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders an animateTransform with begin=indefinite and fill=freeze", () => {
    const { container } = renderFootballBounce();
    const anim = container.querySelector("animateTransform");
    expect(anim).toBeInTheDocument();
    expect(anim.getAttribute("begin")).toBe("indefinite");
    expect(anim.getAttribute("dur")).toBe("3.752s");
    expect(anim.getAttribute("calcMode")).toBe("discrete");
    expect(anim.getAttribute("fill")).toBe("freeze");
  });

  it("calls beginElement() on the animation when the container is clicked", () => {
    const { container } = renderFootballBounce();
    const wrapper = container.querySelector("div.football-bounce");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    fireEvent.click(wrapper);

    expect(animNode.beginElement).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while the animation is running", () => {
    const { container } = renderFootballBounce();
    const wrapper = container.querySelector("div.football-bounce");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    animNode.dispatchEvent(new Event("beginEvent"));
    fireEvent.click(wrapper);

    expect(animNode.beginElement).not.toHaveBeenCalled();
  });

  it("allows replay after the animation finishes", () => {
    const { container } = renderFootballBounce();
    const wrapper = container.querySelector("div.football-bounce");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    animNode.dispatchEvent(new Event("beginEvent"));
    animNode.dispatchEvent(new Event("endEvent"));
    fireEvent.click(wrapper);

    expect(animNode.beginElement).toHaveBeenCalledTimes(1);
  });

  it("does not begin the animation when prefers-reduced-motion is set, but stays clickable", () => {
    setMatchMediaMock({ reduceMotion: true });
    const { container } = renderFootballBounce();
    const wrapper = container.querySelector("div.football-bounce");
    const animNode = container.querySelector("animateTransform");
    animNode.beginElement = jest.fn();

    expect(() => fireEvent.click(wrapper)).not.toThrow();
    expect(animNode.beginElement).not.toHaveBeenCalled();
  });

  it("applies .is-animating on the container while the SMIL animation is running", () => {
    const { container } = renderFootballBounce();
    const wrapper = container.querySelector("div.football-bounce");
    const animNode = container.querySelector("animateTransform");

    expect(wrapper.classList.contains("is-animating")).toBe(false);

    act(() => {
      animNode.dispatchEvent(new Event("beginEvent"));
    });
    expect(wrapper.classList.contains("is-animating")).toBe(true);

    act(() => {
      animNode.dispatchEvent(new Event("endEvent"));
    });
    expect(wrapper.classList.contains("is-animating")).toBe(false);
  });

  it("falls back to SpinSmooth in RTL locales", () => {
    document.dir = "rtl";
    const { container } = renderWithPrefs(<Logo />, {
      [PREF_LOGO_VARIATION]: "football-bounce",
    });
    expect(container.querySelector(".football-bounce")).not.toBeInTheDocument();
    expect(container.querySelector(".spin-smooth")).toBeInTheDocument();
  });
});
