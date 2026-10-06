import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { AdBanner } from "content-src/components/DiscoveryStreamComponents/AdBanner/AdBanner";

const defaultSpoc = {
  format: "leaderboard",
  url: "https://example.com",
  raw_image_src: "https://example.com/img.png",
  title: "Test Ad",
};

const defaultPrefs = {};

describe("<AdBanner>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <AdBanner
          spoc={defaultSpoc}
          dispatch={jest.fn()}
          firstVisibleTimestamp={0}
          row={1}
          type="newtab_spocs"
          prefs={defaultPrefs}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ad-banner-wrapper")).toBeInTheDocument();
  });
});
