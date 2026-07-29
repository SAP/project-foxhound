import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { CollapseToggle } from "content-src/components/DiscoveryStreamAdmin/DiscoveryStreamAdmin";

describe("<CollapseToggle>", () => {
  it("should render the toggle button", () => {
    const { container } = render(
      <WrapWithProvider>
        <CollapseToggle devtoolsCollapsed={true} dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".discoverystream-admin-toggle")
    ).toBeInTheDocument();
  });
});
