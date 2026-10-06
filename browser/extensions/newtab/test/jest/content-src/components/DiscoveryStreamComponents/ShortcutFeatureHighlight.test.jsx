import { render } from "@testing-library/react";
import { ShortcutFeatureHighlight } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/ShortcutFeatureHighlight";

describe("<ShortcutFeatureHighlight>", () => {
  it("should render", () => {
    const { container } = render(
      <ShortcutFeatureHighlight
        dispatch={jest.fn()}
        feature="FEATURE_HIGHLIGHT_DEFAULT"
        handleBlock={jest.fn()}
        handleDismiss={jest.fn()}
        messageData={{ content: {} }}
        position="top-left"
      />
    );
    expect(
      container.querySelector(".shortcut-feature-highlight")
    ).toBeInTheDocument();
  });
});
