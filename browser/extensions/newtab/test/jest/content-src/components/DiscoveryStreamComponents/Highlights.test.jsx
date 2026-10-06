import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { Highlights } from "content-src/components/DiscoveryStreamComponents/Highlights/Highlights";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";

describe("<Highlights>", () => {
  beforeEach(() => {
    Object.defineProperty(window.performance, "mark", {
      configurable: true,
      value: jest.fn(),
    });
  });

  it("should not render without an enabled highlights section", () => {
    const { container } = render(
      <WrapWithProvider>
        <Highlights />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-highlights")).not.toBeInTheDocument();
  });

  it("should render when highlights section is enabled", () => {
    const state = {
      ...INITIAL_STATE,
      Sections: [{ id: "highlights", enabled: true, rows: [] }],
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <Highlights />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-highlights")).toBeInTheDocument();
  });
});
