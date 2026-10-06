import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { Search } from "content-src/components/Search/Search";

jest.mock(
  "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper",
  () => ({
    ExternalComponentWrapper: ({ className }) => <div className={className} />,
  })
);

describe("<Search>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <Search />
      </WrapWithProvider>
    );
    expect(container.querySelector(".search-wrapper")).toBeInTheDocument();
  });
});
