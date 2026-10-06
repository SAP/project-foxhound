import { render } from "@testing-library/react";
import { MoreRecommendations } from "content-src/components/MoreRecommendations/MoreRecommendations";

describe("<MoreRecommendations>", () => {
  it("should not render without read_more_endpoint", () => {
    const { container } = render(<MoreRecommendations />);
    expect(
      container.querySelector(".more-recommendations")
    ).not.toBeInTheDocument();
  });

  it("should render when read_more_endpoint is provided", () => {
    const { container } = render(
      <MoreRecommendations read_more_endpoint="https://example.com/more" />
    );
    expect(
      container.querySelector(".more-recommendations")
    ).toBeInTheDocument();
  });
});
