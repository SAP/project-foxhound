import { render } from "@testing-library/react";
import { HorizontalRule } from "content-src/components/DiscoveryStreamComponents/HorizontalRule/HorizontalRule";

describe("<HorizontalRule>", () => {
  it("should render", () => {
    const { container } = render(<HorizontalRule />);
    expect(container.querySelector(".ds-hr")).toBeInTheDocument();
  });
});
