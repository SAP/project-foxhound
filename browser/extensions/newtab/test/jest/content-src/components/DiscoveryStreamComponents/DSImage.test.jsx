import { render } from "@testing-library/react";
import { DSImage } from "content-src/components/DiscoveryStreamComponents/DSImage/DSImage";

describe("<DSImage>", () => {
  it("should render", () => {
    const { container } = render(<DSImage />);
    expect(container.querySelector(".ds-image")).toBeInTheDocument();
  });
});
