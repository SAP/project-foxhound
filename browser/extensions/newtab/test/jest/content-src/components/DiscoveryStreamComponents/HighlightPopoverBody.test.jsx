/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@testing-library/react";
import { HighlightPopoverBody } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/HighlightPopoverBody";

const defaultBody = {
  image: { src: "default.png" },
  title: { l10nId: "default-title-id" },
  subtitle: { l10nId: "default-subtitle-id" },
};

describe("<HighlightPopoverBody>", () => {
  it("renders defaults from the registry body when content has no overrides", () => {
    const { container } = render(
      <HighlightPopoverBody body={defaultBody} content={{}} />
    );
    expect(container.querySelector(".title").getAttribute("data-l10n-id")).toBe(
      "default-title-id"
    );
    expect(
      container.querySelector(".subtitle").getAttribute("data-l10n-id")
    ).toBe("default-subtitle-id");
    expect(container.querySelector("img").getAttribute("src")).toBe(
      "default.png"
    );
  });

  it("renders raw strings from content.cardTitle / cardMessage when provided", () => {
    const { container } = render(
      <HighlightPopoverBody
        body={defaultBody}
        content={{ cardTitle: "Raw Title", cardMessage: "Raw Body" }}
      />
    );
    expect(container.querySelector(".title").textContent).toBe("Raw Title");
    expect(container.querySelector(".title").hasAttribute("data-l10n-id")).toBe(
      false
    );
    expect(container.querySelector(".subtitle").textContent).toBe("Raw Body");
  });

  it("renders custom l10n ids from content.title / subtitle when raw is absent", () => {
    const { container } = render(
      <HighlightPopoverBody
        body={defaultBody}
        content={{ title: "custom-title-id", subtitle: "custom-subtitle-id" }}
      />
    );
    expect(container.querySelector(".title").getAttribute("data-l10n-id")).toBe(
      "custom-title-id"
    );
    expect(
      container.querySelector(".subtitle").getAttribute("data-l10n-id")
    ).toBe("custom-subtitle-id");
  });

  it("renders content.imageURL override over registry default", () => {
    const { container } = render(
      <HighlightPopoverBody
        body={defaultBody}
        content={{ imageURL: "override.png" }}
      />
    );
    expect(container.querySelector("img").getAttribute("src")).toBe(
      "override.png"
    );
  });

  it("hides the image when content.hideImage is truthy", () => {
    const { container } = render(
      <HighlightPopoverBody body={defaultBody} content={{ hideImage: true }} />
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a <picture> with srcset when body has srcLight/srcDark", () => {
    const { container } = render(
      <HighlightPopoverBody
        body={{
          ...defaultBody,
          image: { srcLight: "light.png", srcDark: "dark.png" },
        }}
        content={{}}
      />
    );
    expect(container.querySelector("picture")).toBeInTheDocument();
    expect(
      container.querySelector('source[media="(prefers-color-scheme: dark)"]')
        .srcset
    ).toBe("dark.png");
    expect(
      container.querySelector('source[media="(prefers-color-scheme: light)"]')
        .srcset
    ).toBe("light.png");
  });
});
