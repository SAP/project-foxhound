import { render } from "@testing-library/react";
import { AdBannerContextMenu } from "content-src/components/DiscoveryStreamComponents/AdBannerContextMenu/AdBannerContextMenu";

const defaultSpoc = {
  title: "Test Ad",
  url: "https://example.com",
  shim: { url: "https://example.com/shim" },
};

describe("<AdBannerContextMenu>", () => {
  it("should render", () => {
    const { container } = render(
      <AdBannerContextMenu
        dispatch={jest.fn()}
        spoc={defaultSpoc}
        position={0}
        type="newtab_spocs"
        showAdReporting={false}
      />
    );
    expect(
      container.querySelector(".ads-context-menu-wrapper")
    ).toBeInTheDocument();
  });
});
