import { render } from "@testing-library/react";
import { SearchShortcutsForm } from "content-src/components/TopSites/SearchShortcutsForm";

const DEFAULT_PROPS = {
  dispatch: jest.fn(),
  onClose: jest.fn(),
  TopSites: {
    rows: [],
    searchShortcuts: [],
  },
};

describe("<SearchShortcutsForm>", () => {
  it("should render", () => {
    const { container } = render(<SearchShortcutsForm {...DEFAULT_PROPS} />);
    expect(container.querySelector(".topsite-form")).toBeInTheDocument();
  });
});
