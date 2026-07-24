/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DEFAULT_BROWSER_DEFAULT_BROWSER_H_
#define DEFAULT_BROWSER_DEFAULT_BROWSER_H_

#include <string>

#include "mozilla/DefineEnum.h"

namespace mozilla::default_agent {

MOZ_DEFINE_ENUM_CLASS(Browser,
                      (Error, Unknown, Firefox, Chrome, EdgeWithEdgeHTML,
                       EdgeWithBlink, InternetExplorer, Opera, Brave, Yandex,
                       QQBrowser, _360Browser, Sogou, DuckDuckGo));

struct DefaultBrowserInfo {
  Browser currentDefaultBrowser;
  Browser previousDefaultBrowser;
};

Browser GetDefaultBrowser();
Browser GetReplacePreviousDefaultBrowser(Browser currentBrowser);

std::string GetStringForBrowser(Browser browser);
Browser GetBrowserFromString(const std::string& browserString);
void MaybeMigrateCurrentDefault();

}  // namespace mozilla::default_agent

#endif  // DEFAULT_BROWSER_DEFAULT_BROWSER_H_
