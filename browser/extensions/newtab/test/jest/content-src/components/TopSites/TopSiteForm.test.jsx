import { render } from "@testing-library/react";
import { TopSiteForm } from "content-src/components/TopSites/TopSiteForm";

const DEFAULT_PROPS = {
  dispatch: jest.fn(),
  onClose: jest.fn(),
  site: null,
  index: -1,
  previewResponse: undefined,
  previewUrl: "",
};

describe("<TopSiteForm>", () => {
  it("should render", () => {
    const { container } = render(<TopSiteForm {...DEFAULT_PROPS} />);
    expect(container.querySelector(".topsite-form")).toBeInTheDocument();
  });
});
