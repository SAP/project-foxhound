import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { DSCard } from "content-src/components/DiscoveryStreamComponents/DSCard/DSCard";

describe("<DSCard>", () => {
  it("should render a placeholder when not yet seen", () => {
    const { container } = render(
      <WrapWithProvider>
        <DSCard dispatch={jest.fn()} type="DISCOVERY_STREAM" />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-card")).toBeInTheDocument();
  });
});
