import { render } from "@testing-library/react";
import { FeatureHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/FeatureHighlight";

describe("<FeatureHighlight>", () => {
  it("should render", () => {
    const { container } = render(
      <FeatureHighlight message={<span />} windowObj={window} />
    );
    expect(container.querySelector(".feature-highlight")).toBeInTheDocument();
  });
});
