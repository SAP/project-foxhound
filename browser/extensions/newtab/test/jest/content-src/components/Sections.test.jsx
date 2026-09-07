import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { _Sections as Sections } from "content-src/components/Sections/Sections";

describe("<Sections>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <Sections
          Sections={[]}
          Prefs={{
            values: {
              sectionOrder: "topsites,topstories,highlights",
              "feeds.topsites": false,
            },
          }}
          dispatch={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".sections-list")).toBeInTheDocument();
  });
});
