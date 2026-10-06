import { render } from "@testing-library/react";
import { ActivationWindowMessage } from "content-src/components/ActivationWindowMessage/ActivationWindowMessage";

describe("<ActivationWindowMessage>", () => {
  it("should render", () => {
    const props = {
      dispatch: jest.fn(),
      handleBlock: jest.fn(),
      handleClick: jest.fn(),
      handleDismiss: jest.fn(),
      messageData: { content: {} },
    };
    const { container } = render(<ActivationWindowMessage {...props} />);
    expect(
      container.querySelector(".activation-window-message")
    ).toBeInTheDocument();
  });
});
