import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { ContextMenu } from "content-src/components/ContextMenu/ContextMenu";

describe("<ContextMenu>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <ContextMenu onUpdate={jest.fn()} options={[]} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".context-menu")).toBeInTheDocument();
  });
});
