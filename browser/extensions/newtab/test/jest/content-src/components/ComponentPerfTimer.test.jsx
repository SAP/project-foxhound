import { render } from "@testing-library/react";
import { ComponentPerfTimer } from "content-src/components/ComponentPerfTimer/ComponentPerfTimer";

const perfSvc = { mark: jest.fn(), getMostRecentAbsMarkStartByName: jest.fn() };

describe("<ComponentPerfTimer>", () => {
  it("should render its children", () => {
    const { getByText } = render(
      <ComponentPerfTimer
        id="highlights"
        dispatch={jest.fn()}
        initialized={true}
        perfSvc={perfSvc}
      >
        <span>child content</span>
      </ComponentPerfTimer>
    );
    expect(getByText("child content")).toBeInTheDocument();
  });
});
