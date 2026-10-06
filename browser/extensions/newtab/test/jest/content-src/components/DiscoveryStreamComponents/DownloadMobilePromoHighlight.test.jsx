import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { DownloadMobilePromoHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/DownloadMobilePromoHighlight";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";

describe("<DownloadMobilePromoHighlight>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <DownloadMobilePromoHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".download-firefox-feature-highlight")
    ).toBeInTheDocument();
  });

  it("should render with a variant pref set", () => {
    const state = {
      ...INITIAL_STATE,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          "mobileDownloadModal.variant-a": true,
        },
      },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <DownloadMobilePromoHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".download-firefox-feature-highlight")
    ).toBeInTheDocument();
  });
});
