import { render } from "@testing-library/react";
import { PrivacyLink } from "content-src/components/DiscoveryStreamComponents/PrivacyLink/PrivacyLink";

describe("<PrivacyLink>", () => {
  it("should render", () => {
    const { container } = render(
      <PrivacyLink
        properties={{ url: "https://example.com", title: "Privacy" }}
      />
    );
    expect(container.querySelector(".ds-privacy-link")).toBeInTheDocument();
  });
});
