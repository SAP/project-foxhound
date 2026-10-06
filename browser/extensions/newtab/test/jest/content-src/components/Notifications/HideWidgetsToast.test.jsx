import { render } from "@testing-library/react";
import { HideWidgetsToast } from "content-src/components/Notifications/Toasts/HideWidgetsToast";

describe("<HideWidgetsToast>", () => {
  it("should render", () => {
    const { container } = render(
      <HideWidgetsToast onDismissClick={jest.fn()} onAnimationEnd={jest.fn()} />
    );
    expect(
      container.querySelector(".notification-feed-item")
    ).toBeInTheDocument();
  });
});
