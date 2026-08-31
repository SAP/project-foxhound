import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { ExternalComponentWrapper } from "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper";

const SEARCH_STATE = {
  ...INITIAL_STATE,
  ExternalComponents: {
    components: [
      {
        type: "SEARCH",
        tagName: "search-component",
        componentURL: "chrome://newtab/content/search.js",
        l10nURLs: [],
        attributes: {},
        cssVariables: {},
      },
    ],
  },
};

describe("<ExternalComponentWrapper>", () => {
  it("should render the container div", () => {
    const { container } = render(
      <WrapWithProvider state={SEARCH_STATE}>
        <ExternalComponentWrapper
          type="SEARCH"
          className="search-inner-wrapper"
          importModule={jest.fn(() => Promise.resolve())}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".search-inner-wrapper")
    ).toBeInTheDocument();
  });
});
