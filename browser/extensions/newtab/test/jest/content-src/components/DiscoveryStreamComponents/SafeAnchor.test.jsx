import { render } from "@testing-library/react";
import { SafeAnchor } from "content-src/components/DiscoveryStreamComponents/SafeAnchor/SafeAnchor";

describe("<SafeAnchor>", () => {
  it("should render", () => {
    const { container } = render(
      <SafeAnchor url="https://example.com">Link</SafeAnchor>
    );
    expect(container.querySelector("a")).toBeInTheDocument();
  });
});
