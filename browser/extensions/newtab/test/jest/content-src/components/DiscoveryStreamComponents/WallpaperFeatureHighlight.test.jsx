import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { WallpaperFeatureHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/WallpaperFeatureHighlight";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";

describe("<WallpaperFeatureHighlight>", () => {
  it("should render when messageData has content", () => {
    const state = {
      ...INITIAL_STATE,
      Messages: {
        ...INITIAL_STATE.Messages,
        messageData: { content: { feature: "WALLPAPER" } },
      },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <WallpaperFeatureHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleClick={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".wallpaper-feature-highlight")
    ).toBeInTheDocument();
  });

  it("should render the Nova image class when nova.enabled is true", () => {
    const state = {
      ...INITIAL_STATE,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          "nova.enabled": true,
        },
      },
      Messages: {
        ...INITIAL_STATE.Messages,
        messageData: { content: { feature: "WALLPAPER" } },
      },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <WallpaperFeatureHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleClick={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".wallpaper-feature-highlight-image")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".follow-section-button-highlight-image")
    ).not.toBeInTheDocument();
  });

  it("renders the World Cup variant when messageType is WorldCupWallpaperHighlight", () => {
    const state = {
      ...INITIAL_STATE,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          "nova.enabled": true,
        },
      },
      Messages: {
        ...INITIAL_STATE.Messages,
        messageData: {
          content: {
            feature: "WALLPAPER",
            messageType: "WorldCupWallpaperHighlight",
          },
        },
      },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <WallpaperFeatureHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleClick={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".wallpaper-feature-highlight.world-cup-variant")
    ).toBeInTheDocument();
    expect(container.querySelector(".title").getAttribute("data-l10n-id")).toBe(
      "newtab-sports-widget-message-wallpapers-title"
    );
    expect(
      container.querySelector(".subtitle").getAttribute("data-l10n-id")
    ).toBe("newtab-sports-widget-message-wallpapers-body");
    expect(
      container.querySelector('source[media="(prefers-color-scheme: light)"]')
        .srcset
    ).toContain("wallpaper-callout.png");
  });

  it("does not apply the World Cup variant outside Nova mode", () => {
    const state = {
      ...INITIAL_STATE,
      Messages: {
        ...INITIAL_STATE.Messages,
        messageData: {
          content: {
            feature: "WALLPAPER",
            messageType: "WorldCupWallpaperHighlight",
          },
        },
      },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <WallpaperFeatureHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleClick={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".wallpaper-feature-highlight.world-cup-variant")
    ).not.toBeInTheDocument();
  });
});
