import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { _Card as Card } from "content-src/components/Card/Card";

describe("<Card>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <Card
          link={{ url: "https://example.com", title: "Test" }}
          dispatch={jest.fn()}
          index={0}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".card-outer")).toBeInTheDocument();
  });
});
