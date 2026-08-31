import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { _LinkMenu as LinkMenu } from "content-src/components/LinkMenu/LinkMenu";

describe("<LinkMenu>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <LinkMenu
          dispatch={jest.fn()}
          index={0}
          source="TOP_SITES"
          options={["OpenInNewWindow", "Separator", "BlockUrl"]}
          site={{ url: "https://example.com" }}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".context-menu")).toBeInTheDocument();
  });
});
