import { render } from "@testing-library/react";
import {
  ErrorBoundary,
  ErrorBoundaryFallback,
} from "content-src/components/ErrorBoundary/ErrorBoundary";

describe("<ErrorBoundary>", () => {
  it("should render its children when there is no error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <span>child content</span>
      </ErrorBoundary>
    );
    expect(getByText("child content")).toBeInTheDocument();
  });
});

describe("<ErrorBoundaryFallback>", () => {
  it("should render", () => {
    const { container } = render(<ErrorBoundaryFallback />);
    expect(container.querySelector(".as-error-fallback")).toBeInTheDocument();
  });
});
