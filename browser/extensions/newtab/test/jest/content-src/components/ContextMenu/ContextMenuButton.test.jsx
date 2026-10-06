import { render } from "@testing-library/react";
import { ContextMenuButton } from "content-src/components/ContextMenu/ContextMenuButton";

describe("<ContextMenuButton>", () => {
  it("should render", () => {
    const { container } = render(
      <ContextMenuButton onUpdate={jest.fn()}>
        <div />
      </ContextMenuButton>
    );
    expect(container.querySelector(".context-menu-button")).toBeInTheDocument();
  });
});
