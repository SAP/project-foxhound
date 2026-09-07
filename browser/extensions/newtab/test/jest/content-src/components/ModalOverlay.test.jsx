import { render } from "@testing-library/react";
import { ModalOverlayWrapper } from "content-src/components/ModalOverlay/ModalOverlay";

describe("<ModalOverlayWrapper>", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close = jest.fn();
  });

  it("should render", () => {
    const { container } = render(
      <ModalOverlayWrapper onClose={jest.fn()}>
        <div />
      </ModalOverlayWrapper>
    );
    expect(container.querySelector(".modalOverlayOuter")).toBeInTheDocument();
  });
});
