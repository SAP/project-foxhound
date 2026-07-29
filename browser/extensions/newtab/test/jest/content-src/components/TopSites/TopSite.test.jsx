import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { TopSite } from "content-src/components/TopSites/TopSite";

const DEFAULT_LINK = {
  url: "https://example.com",
  hostname: "example.com",
  title: "Example",
  label: "Example",
  iconType: "no_image",
};

describe("<TopSite>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <TopSite
          link={DEFAULT_LINK}
          index={0}
          dispatch={jest.fn()}
          onDragEvent={jest.fn()}
          activeIndex={-1}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".top-site-outer")).toBeInTheDocument();
  });
});
