import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { SectionsMgmtPanel } from "content-src/components/CustomizeMenu/SectionsMgmtPanel/SectionsMgmtPanel";

const FEED_URL = "https://feeds.example.com/top-stories";

const STATE_WITH_SECTIONS = {
  ...INITIAL_STATE,
  DiscoveryStream: {
    ...INITIAL_STATE.DiscoveryStream,
    sectionPersonalization: {},
    layout: [
      {
        components: [
          {
            type: "CardGrid",
            feed: { url: FEED_URL },
          },
        ],
      },
    ],
    feeds: {
      data: {
        [FEED_URL]: {
          data: {
            sections: [],
          },
        },
      },
    },
  },
};

describe("<SectionsMgmtPanel>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider state={STATE_WITH_SECTIONS}>
        <SectionsMgmtPanel
          exitEventFired={false}
          pocketEnabled={true}
          onSubpanelToggle={jest.fn()}
          togglePanel={jest.fn()}
          showPanel={false}
        />
      </WrapWithProvider>
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
