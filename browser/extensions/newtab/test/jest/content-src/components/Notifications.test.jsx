import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { Notifications } from "content-src/components/Notifications/Notifications";

describe("<Notifications>", () => {
  it("should render when toastQueue is non-empty", () => {
    const state = {
      ...INITIAL_STATE,
      Notifications: { toastQueue: ["hideWidgetsToast"], toastCounter: 0 },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <Notifications dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".notification-wrapper")
    ).toBeInTheDocument();
  });
});
