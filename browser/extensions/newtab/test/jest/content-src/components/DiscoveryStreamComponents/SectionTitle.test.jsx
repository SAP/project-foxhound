import { render } from "@testing-library/react";
import { SectionTitle } from "content-src/components/DiscoveryStreamComponents/SectionTitle/SectionTitle";

describe("<SectionTitle>", () => {
  it("should render", () => {
    const { container } = render(
      <SectionTitle header={{ title: "Test Title" }} />
    );
    expect(container.querySelector(".ds-section-title")).toBeInTheDocument();
  });
});
