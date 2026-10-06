/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

jest.mock(
  "content-src/components/DiscoveryStreamComponents/FeatureHighlight/OMCHighlightRegistry.mjs",
  () => {
    const actual = jest.requireActual(
      "content-src/components/DiscoveryStreamComponents/FeatureHighlight/OMCHighlightRegistry.mjs"
    );
    const TEST_REGISTRY = {
      TestPopover: {
        slot: "widgets-row",
        shell: actual.SHELLS.POPOVER,
        chrome: {
          position: "inset-block-start inset-inline-center",
          arrowPosition: "",
          modalClassName: "test-popover-card",
        },
        body: {
          image: { src: "test.png" },
          title: { l10nId: "test-shared-title" },
          subtitle: { l10nId: "test-shared-subtitle" },
        },
        dismiss: actual.DISMISS_MODES.BLOCK,
      },
    };
    return {
      ...actual,
      OMC_HIGHLIGHT_REGISTRY: TEST_REGISTRY,
      getRegistryEntry: messageType =>
        messageType ? TEST_REGISTRY[messageType] || null : null,
    };
  }
);

import { render } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { OMCHighlightSlot } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/OMCHighlightSlot";
import { SLOTS } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/OMCHighlightSlots.mjs";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";

function stateWithMessage(content) {
  return {
    ...INITIAL_STATE,
    Messages: {
      ...INITIAL_STATE.Messages,
      messageData: { id: "test-message-id", content },
    },
  };
}

describe("<OMCHighlightSlot>", () => {
  it("renders nothing when messageData has no messageType", () => {
    const state = stateWithMessage({});
    const { container } = render(
      <WrapWithProvider state={state}>
        <OMCHighlightSlot slot={SLOTS.WIDGETS_ROW} dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".feature-highlight")).toBeNull();
  });

  it("renders nothing when messageType has no matching registry entry", () => {
    const state = stateWithMessage({ messageType: "NotRegistered" });
    const { container } = render(
      <WrapWithProvider state={state}>
        <OMCHighlightSlot slot={SLOTS.WIDGETS_ROW} dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".feature-highlight")).toBeNull();
  });

  it("renders nothing when entry targets a different slot", () => {
    const state = stateWithMessage({ messageType: "TestPopover" });
    const { container } = render(
      <WrapWithProvider state={state}>
        <OMCHighlightSlot slot="some-other-slot" dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".feature-highlight")).toBeNull();
  });

  it("renders the popover when messageType matches and slot is widgets-row", () => {
    const state = stateWithMessage({ messageType: "TestPopover" });
    const { container } = render(
      <WrapWithProvider state={state}>
        <OMCHighlightSlot slot={SLOTS.WIDGETS_ROW} dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".feature-highlight")).toBeInTheDocument();
    expect(container.querySelector(".test-popover-card")).toBeInTheDocument();
    expect(container.querySelector(".title").getAttribute("data-l10n-id")).toBe(
      "test-shared-title"
    );
    expect(
      container.querySelector(".subtitle").getAttribute("data-l10n-id")
    ).toBe("test-shared-subtitle");
  });

  it("applies content overrides when OMC sends raw cardTitle/cardMessage", () => {
    const state = stateWithMessage({
      messageType: "TestPopover",
      cardTitle: "Override Title",
      cardMessage: "Override Body",
    });
    const { container } = render(
      <WrapWithProvider state={state}>
        <OMCHighlightSlot slot={SLOTS.WIDGETS_ROW} dispatch={jest.fn()} />
      </WrapWithProvider>
    );
    expect(container.querySelector(".title").textContent).toBe(
      "Override Title"
    );
    expect(container.querySelector(".subtitle").textContent).toBe(
      "Override Body"
    );
  });
});
