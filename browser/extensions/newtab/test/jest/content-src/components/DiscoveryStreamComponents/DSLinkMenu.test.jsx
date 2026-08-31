import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { DSLinkMenu } from "content-src/components/DiscoveryStreamComponents/DSLinkMenu/DSLinkMenu";

describe("<DSLinkMenu>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <DSLinkMenu dispatch={jest.fn()} index={0} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".context-menu-position-container")
    ).toBeInTheDocument();
  });
});
