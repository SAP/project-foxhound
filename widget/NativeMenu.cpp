/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NativeMenu.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/HTMLImageElement.h"
#include "mozilla/dom/ResponsiveImageSelector.h"
#include "mozilla/ComputedStyle.h"
#include "nsComputedDOMStyle.h"

namespace mozilla::widget {

NativeMenuIcon NativeMenu::GetIcon(dom::Element& aElement) {
  RefPtr img =
      dom::HTMLImageElement::FromNodeOrNull(aElement.GetFirstElementChild());
  if (!img) {
    return {};
  }
  // We need the style for context paint, even if we end up using the image
  // attribute.
  RefPtr<const ComputedStyle> style = nsComputedDOMStyle::GetComputedStyle(img);
  if (RefPtr uri = img->GetCurrentURI()) {
    return {std::move(uri), std::move(style)};
  }
  // Try to take the selected image from the image selector. This works even if
  // the image hasn't loaded yet (due to loading=lazy or such).
  if (auto* selector = img->GetResponsiveImageSelector()) {
    if (RefPtr uri = selector->GetSelectedImageURL()) {
      return {std::move(uri), std::move(style)};
    }
  }
  // Otherwise look for the icon's content property.
  if (!style) {
    return {};
  }
  auto items = style->StyleContent()->NonAltContentItems();
  if (items.Length() != 1 || !items[0].IsImage()) {
    return {};
  }
  const auto* url = items[0].AsImage().GetImageRequestURLValue();
  if (!url) {
    return {};
  }
  RefPtr uri = url->GetURI();
  if (!uri) {
    return {};
  }
  return {std::move(uri), std::move(style)};
}

}  // namespace mozilla::widget
