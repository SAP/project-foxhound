import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { _CollapsibleSection as CollapsibleSection } from "content-src/components/CollapsibleSection/CollapsibleSection";

describe("<CollapsibleSection>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <CollapsibleSection
          id="test-section"
          title="Test"
          Prefs={{ values: {} }}
          dispatch={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector("section")).toBeInTheDocument();
  });
});
