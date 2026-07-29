import { render } from "@testing-library/react";
import { Navigation } from "content-src/components/DiscoveryStreamComponents/Navigation/Navigation";

describe("<Navigation>", () => {
  it("should render", () => {
    const { container } = render(
      <Navigation locale="en-US" dispatch={jest.fn()} />
    );
    expect(container.querySelector(".ds-navigation")).toBeInTheDocument();
  });
});
