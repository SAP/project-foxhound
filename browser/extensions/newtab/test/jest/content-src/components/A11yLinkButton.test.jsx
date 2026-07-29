import { render } from "@testing-library/react";
import { A11yLinkButton } from "content-src/components/A11yLinkButton/A11yLinkButton";

describe("<A11yLinkButton>", () => {
  it("should render", () => {
    const { container } = render(<A11yLinkButton />);
    expect(container.querySelector(".a11y-link-button")).toBeInTheDocument();
  });
});
