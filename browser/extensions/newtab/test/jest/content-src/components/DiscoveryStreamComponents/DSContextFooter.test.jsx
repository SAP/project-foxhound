import { render } from "@testing-library/react";
import { DSContextFooter } from "content-src/components/DiscoveryStreamComponents/DSContextFooter/DSContextFooter";

describe("<DSContextFooter>", () => {
  it("should render with sponsor label", () => {
    const { container } = render(<DSContextFooter sponsor="Test Sponsor" />);
    expect(container.querySelector(".story-footer")).toBeInTheDocument();
  });
});
