import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { TopicsWidget } from "content-src/components/DiscoveryStreamComponents/TopicsWidget/TopicsWidget";

describe("<TopicsWidget>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <TopicsWidget
          dispatch={jest.fn()}
          source="CARDGRID_WIDGET"
          position={0}
          id={1}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-topics-widget")).toBeInTheDocument();
  });
});
