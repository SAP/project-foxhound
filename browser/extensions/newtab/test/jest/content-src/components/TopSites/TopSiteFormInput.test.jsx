import { render } from "@testing-library/react";
import { TopSiteFormInput } from "content-src/components/TopSites/TopSiteFormInput";

describe("<TopSiteFormInput>", () => {
  it("should render", () => {
    const { container } = render(
      <TopSiteFormInput
        onChange={jest.fn()}
        titleId="newtab-topsites-title-label"
      />
    );
    expect(container.querySelector("label")).toBeInTheDocument();
  });
});
