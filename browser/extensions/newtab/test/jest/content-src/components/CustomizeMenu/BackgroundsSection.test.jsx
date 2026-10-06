import { render } from "@testing-library/react";
import { BackgroundsSection } from "content-src/components/CustomizeMenu/BackgroundsSection/BackgroundsSection";

describe("<BackgroundsSection>", () => {
  it("should render", () => {
    const { container } = render(<BackgroundsSection />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
