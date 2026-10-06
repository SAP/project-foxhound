import { render } from "@testing-library/react";
import { DSEmptyState } from "content-src/components/DiscoveryStreamComponents/DSEmptyState/DSEmptyState";

describe("<DSEmptyState>", () => {
  it("should render", () => {
    const { container } = render(<DSEmptyState dispatch={jest.fn()} />);
    expect(container.querySelector(".section-empty-state")).toBeInTheDocument();
  });
});
