import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { WidgetsRowFeatureHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/WidgetsRowFeatureHighlight";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";

describe("<WidgetsRowFeatureHighlight>", () => {
  it("should render when messageData has content", () => {
    const state = {
      ...INITIAL_STATE,
      Messages: {
        ...INITIAL_STATE.Messages,
        messageData: { content: { feature: "WIDGETS_ROW" } },
      },
    };
    const { container } = render(
      <WrapWithProvider state={state}>
        <WidgetsRowFeatureHighlight
          dispatch={jest.fn()}
          handleDismiss={jest.fn()}
          handleBlock={jest.fn()}
        />
      </WrapWithProvider>
    );
    expect(container.querySelector(".feature-highlight")).toBeInTheDocument();
  });
});
