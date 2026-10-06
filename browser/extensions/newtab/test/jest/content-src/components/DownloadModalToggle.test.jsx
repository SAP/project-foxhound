import { render } from "@testing-library/react";
import { DownloadModalToggle } from "content-src/components/DownloadModalToggle/DownloadModalToggle";

describe("<DownloadModalToggle>", () => {
  it("should render", () => {
    const { container } = render(
      <DownloadModalToggle onClick={jest.fn()} isActive={false} />
    );
    expect(
      container.querySelector(".mobile-download-promo")
    ).toBeInTheDocument();
  });
});
