/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/NavigationUtils.h"

#include "mozilla/dom/NavigationBinding.h"
#include "nsDocShellLoadTypes.h"

namespace mozilla::dom {

/* static */ Maybe<NavigationHistoryBehavior>
NavigationUtils::NavigationHistoryBehavior(NavigationType aNavigationType) {
  switch (aNavigationType) {
    case NavigationType::Push:
      return Some(NavigationHistoryBehavior::Push);
    case NavigationType::Replace:
      return Some(NavigationHistoryBehavior::Replace);
    default:
      break;
  }
  return Nothing();
}

/*static*/ Maybe<NavigationType>
NavigationUtils::NavigationTypeFromNavigationHistoryBehavior(
    enum NavigationHistoryBehavior aBehavior) {
  switch (aBehavior) {
    case NavigationHistoryBehavior::Push:
      return Some(NavigationType::Push);
    case NavigationHistoryBehavior::Replace:
      return Some(NavigationType::Replace);
    default:
      break;
  }
  return Nothing();
}

/* static */
Maybe<NavigationType> NavigationUtils::NavigationTypeFromLoadType(
    uint32_t aLoadType) {
  MOZ_ASSERT(IsValidLoadType(aLoadType));

  switch (aLoadType) {
    case LOAD_HISTORY:
      return Some(NavigationType::Traverse);

    case LOAD_NORMAL:
    case LOAD_NORMAL_BYPASS_CACHE:
    case LOAD_NORMAL_BYPASS_PROXY:
    case LOAD_NORMAL_BYPASS_PROXY_AND_CACHE:
    case LOAD_PUSHSTATE:
    case LOAD_LINK:
    case LOAD_STOP_CONTENT:
    case LOAD_ERROR_PAGE:
    case LOAD_BYPASS_HISTORY:
      return Some(NavigationType::Push);

    case LOAD_RELOAD_NORMAL:
    case LOAD_RELOAD_CHARSET_CHANGE:
    case LOAD_RELOAD_CHARSET_CHANGE_BYPASS_PROXY_AND_CACHE:
    case LOAD_RELOAD_CHARSET_CHANGE_BYPASS_CACHE:
    case LOAD_RELOAD_BYPASS_CACHE:
    case LOAD_RELOAD_BYPASS_PROXY:
    case LOAD_RELOAD_BYPASS_PROXY_AND_CACHE:
    case LOAD_REFRESH:
      return Some(NavigationType::Reload);

    case LOAD_STOP_CONTENT_AND_REPLACE:
    case LOAD_NORMAL_REPLACE:
    case LOAD_REFRESH_REPLACE:
    case LOAD_REPLACE_BYPASS_CACHE:
      return Some(NavigationType::Replace);

    default:
      // This is an invalid load type.
      return {};
  }
}

}  // namespace mozilla::dom
