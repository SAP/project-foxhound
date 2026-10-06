import { fireEvent, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers } from "redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { SectionContextMenu } from "content-src/components/DiscoveryStreamComponents/SectionContextMenu/SectionContextMenu";
import { WrapWithProvider } from "test/jest/test-utils";

describe("<SectionContextMenu>", () => {
  it("should render", () => {
    const { container } = render(
      <WrapWithProvider>
        <SectionContextMenu
          dispatch={jest.fn()}
          source=""
          index={0}
          sectionKey=""
          following={false}
          sectionPersonalization={null}
          sectionPosition={null}
        />
      </WrapWithProvider>
    );
    expect(
      container.querySelector(".section-context-menu")
    ).toBeInTheDocument();
  });

  it("should open the learn more url and record telemetry when Learn More is clicked", () => {
    const learnMoreUrl = "https://example.com/learn-more";
    const store = createStore(combineReducers(reducers), INITIAL_STATE);
    const dispatch = jest.spyOn(store, "dispatch");

    const { container } = render(
      <Provider store={store}>
        <SectionContextMenu
          dispatch={store.dispatch}
          learnMoreUrl={learnMoreUrl}
        />
      </Provider>
    );

    fireEvent.click(container.querySelector("moz-button"));
    fireEvent.click(
      container
        .querySelector('[data-l10n-id="newtab-menu-section-learn-more"]')
        .closest("button")
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "OPEN_LINK",
        data: expect.objectContaining({ url: learnMoreUrl }),
      })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CLICK_SECTION_LEARN_MORE" })
    );
  });
});
