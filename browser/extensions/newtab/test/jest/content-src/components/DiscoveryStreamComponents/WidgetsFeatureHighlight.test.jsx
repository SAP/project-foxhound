import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { WidgetsFeatureHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/WidgetsFeatureHighlight";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";

describe("<WidgetsFeatureHighlight>", () => {
  it("should render when messageData has content", () => {
    const state = {
      ...INITIAL_STATE,
      Messages: {
        ...INITIAL_STATE.Messages,
        messageData: { content: { feature: "WIDGETS" } },
      },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <WidgetsFeatureHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".feature-highlight")).toBeInTheDocument();
  });
});
