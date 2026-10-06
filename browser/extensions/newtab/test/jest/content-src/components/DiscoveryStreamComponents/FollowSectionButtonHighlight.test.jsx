import { render } from "@testing-library/react";
import { FollowSectionButtonHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/FollowSectionButtonHighlight";

describe("<FollowSectionButtonHighlight>", () => {
  it("should render", () => {
    const { container } = render(
      <FollowSectionButtonHighlight
        dispatch={jest.fn()}
        feature="FEATURE_HIGHLIGHT_DEFAULT"
        handleBlock={jest.fn()}
        handleDismiss={jest.fn()}
        messageData={{ content: {} }}
        position="top-left"
      />
    );
    expect(
      container.querySelector(".follow-section-button-highlight")
    ).toBeInTheDocument();
  });
});
