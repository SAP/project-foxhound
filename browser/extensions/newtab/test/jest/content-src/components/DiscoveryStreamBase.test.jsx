import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { _DiscoveryStreamBase as DiscoveryStreamBase } from "content-src/components/DiscoveryStreamBase/DiscoveryStreamBase";

describe("<DiscoveryStreamBase>", () => {
  it("should not render without a topstories section", () => {
    const props = {
      DiscoveryStream: INITIAL_STATE.DiscoveryStream,
      Prefs: INITIAL_STATE.Prefs,
      Sections: [],
      App: INITIAL_STATE.App,
      dispatch: jest.fn(),
    };
    const { container } = render(
      <WrapWithProvider>
        <DiscoveryStreamBase {...props} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".ds-layout")).not.toBeInTheDocument();
  });
});
