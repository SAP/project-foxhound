/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DEFAULT_BROWSER_TELEMETRY_H_
#define DEFAULT_BROWSER_TELEMETRY_H_

#include <windows.h>

#include "DefaultBrowser.h"
#include "DefaultPDF.h"
#include "Notification.h"

namespace mozilla::default_agent {

HRESULT SendDefaultAgentPing(const DefaultBrowserInfo& browserInfo,
                             const DefaultPdfInfo& pdfInfo,
                             const NotificationActivities& activitiesPerformed,
                             uint32_t daysSinceLastAppLaunch,
                             const std::string& isTaskbarPinned);

}  // namespace mozilla::default_agent

#endif  // DEFAULT_BROWSER_TELEMETRY_H_
