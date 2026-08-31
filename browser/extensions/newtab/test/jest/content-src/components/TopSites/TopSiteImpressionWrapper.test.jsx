import { render } from "@testing-library/react";
import { TopSiteImpressionWrapper } from "content-src/components/TopSites/TopSiteImpressionWrapper";

describe("<TopSiteImpressionWrapper>", () => {
  it("should render", () => {
    const { container } = render(
      <TopSiteImpressionWrapper dispatch={jest.fn()}>
        <div />
      </TopSiteImpressionWrapper>
    );
    expect(
      container.querySelector(".topsite-impression-observer")
    ).toBeInTheDocument();
  });
});
