import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { MessageWrapper } from "content-src/components/MessageWrapper/MessageWrapper";

function Child() {
  return <div className="child-content" />;
}

describe("<MessageWrapper>", () => {
  it("should not render when message is not visible", () => {
    const state = {
      ...INITIAL_STATE,
      Messages: { ...INITIAL_STATE.Messages, isVisible: false },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <MessageWrapper dispatch={jest.fn()}>
          <Child />
        </MessageWrapper>
      </WrapWithProvider>
    );
    expect(container.querySelector(".message-wrapper")).not.toBeInTheDocument();
  });

  it("should render when message is visible", () => {
    const { container } = render(
      <WrapWithProvider>
        <MessageWrapper dispatch={jest.fn()}>
          <Child />
        </MessageWrapper>
      </WrapWithProvider>
    );
    expect(container.querySelector(".message-wrapper")).toBeInTheDocument();
  });

  it("applies wrapperClassName alongside message-wrapper when provided", () => {
    const { container } = render(
      <WrapWithProvider>
        <MessageWrapper dispatch={jest.fn()} wrapperClassName="extra-class">
          <Child />
        </MessageWrapper>
      </WrapWithProvider>
    );
    const wrapper = container.querySelector(".message-wrapper");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.classList.contains("extra-class")).toBe(true);
  });
});
