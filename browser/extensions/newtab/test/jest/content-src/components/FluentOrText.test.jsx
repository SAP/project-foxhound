import { render } from "@testing-library/react";
import { FluentOrText } from "content-src/components/FluentOrText/FluentOrText";

describe("<FluentOrText>", () => {
  it("should render with a string message", () => {
    const { getByText } = render(<FluentOrText message="Hello" />);
    expect(getByText("Hello")).toBeInTheDocument();
  });
});
