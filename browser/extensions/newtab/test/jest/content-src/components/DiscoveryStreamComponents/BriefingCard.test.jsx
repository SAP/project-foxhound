import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { BriefingCard } from "content-src/components/DiscoveryStreamComponents/BriefingCard/BriefingCard";

const defaultHeadline = {
  id: "1",
  url: "https://example.com",
  title: "Test Headline",
  publisher: "Test Publisher",
  pos: 0,
};

describe("<BriefingCard>", () => {
  it("should not render without headlines", () => {
    const { container } = render(
      <WrapWithProvider>
        <BriefingCard headlines={[]} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".briefing-card")).not.toBeInTheDocument();
  });

  it("should render when headlines are provided", () => {
    const { container } = render(
      <WrapWithProvider>
        <BriefingCard headlines={[defaultHeadline]} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".briefing-card")).toBeInTheDocument();
  });
});
