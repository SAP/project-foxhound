import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { CardGrid } from "content-src/components/DiscoveryStreamComponents/CardGrid/CardGrid";

describe("<CardGrid>", () => {
  it("should not render without data", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardGrid dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".ds-card-grid-container")
    ).not.toBeInTheDocument();
  });

  it("should render when data is provided", () => {
    const { container } = render(
      <WrapWithProvider>
        <CardGrid
          dispatch={jest.fn()}
          data={{ recommendations: [] }}
          feed={{ url: "https://example.com" }}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".ds-card-grid-container")
    ).toBeInTheDocument();
  });
});
