import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { ReportContent } from "content-src/components/DiscoveryStreamComponents/ReportContent/ReportContent";

describe("<ReportContent>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <ReportContent spocs={{ data: {} }} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".report-content-form")).toBeInTheDocument();
  });
});
