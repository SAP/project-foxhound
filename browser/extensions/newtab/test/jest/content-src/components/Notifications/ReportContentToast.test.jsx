import { render } from "@testing-library/react";
import { ReportContentToast } from "content-src/components/Notifications/Toasts/ReportContentToast";

describe("<ReportContentToast>", () => {
  it("should render", () => {
    const { container } = render(
      <ReportContentToast
        onDismissClick={jest.fn()}
        onAnimationEnd={jest.fn()}
      />
    );
    expect(
      container.querySelector(".notification-feed-item")
    ).toBeInTheDocument();
  });
});
