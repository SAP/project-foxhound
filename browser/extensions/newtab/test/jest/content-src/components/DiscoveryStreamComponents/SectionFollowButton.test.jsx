/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, fireEvent } from "@testing-library/react";
import { SectionFollowButton } from "content-src/components/DiscoveryStreamComponents/SectionFollowButton/SectionFollowButton";

const DEFAULT_PROPS = {
  following: false,
  onFollowClick: jest.fn(),
  onUnfollowClick: jest.fn(),
  title: "Health",
};

describe("<SectionFollowButton>", () => {
  it("should render a plus icon and default button type in idle state", () => {
    const { container } = render(<SectionFollowButton {...DEFAULT_PROPS} />);
    const button = container.querySelector("moz-button");
    expect(button.getAttribute("iconsrc")).toContain("plus.svg");
    expect(button.getAttribute("type")).toBe("default");
  });

  it("should show primary button type and follow label on hover", () => {
    const { container } = render(<SectionFollowButton {...DEFAULT_PROPS} />);
    fireEvent.mouseEnter(container.querySelector(".section-follow"));
    const button = container.querySelector("moz-button");
    expect(button.getAttribute("type")).toBe("primary");
    expect(button.getAttribute("data-l10n-id")).toBe(
      "newtab-section-follow-button"
    );
  });

  it("should render a check icon and following class when following", () => {
    const { container } = render(
      <SectionFollowButton {...DEFAULT_PROPS} following={true} />
    );
    const button = container.querySelector("moz-button");
    expect(button.getAttribute("iconsrc")).toContain("check.svg");
    expect(
      container.querySelector(".section-follow.following")
    ).toBeInTheDocument();
  });

  it("should show destructive button type and close icon on hover when following", () => {
    const { container } = render(
      <SectionFollowButton {...DEFAULT_PROPS} following={true} />
    );
    fireEvent.mouseEnter(container.querySelector(".section-follow"));
    const button = container.querySelector("moz-button");
    expect(button.getAttribute("type")).toBe("destructive");
    expect(button.getAttribute("iconsrc")).toContain("close.svg");
  });

  it("should have an aria-label containing topic in idle state", () => {
    const { container } = render(<SectionFollowButton {...DEFAULT_PROPS} />);
    const button = container.querySelector("moz-button");
    expect(button.getAttribute("data-l10n-id")).toBe(
      "newtab-section-follow-button-label"
    );
    expect(button.getAttribute("data-l10n-args")).toBe(
      JSON.stringify({ topic: "Health" })
    );
  });

  it("should use unfollow aria-label in idle state when following", () => {
    const { container } = render(
      <SectionFollowButton {...DEFAULT_PROPS} following={true} />
    );
    const button = container.querySelector("moz-button");
    expect(button.getAttribute("data-l10n-id")).toBe(
      "newtab-section-unfollow-button-label"
    );
    expect(button.getAttribute("data-l10n-args")).toBe(
      JSON.stringify({ topic: "Health" })
    );
  });
});
