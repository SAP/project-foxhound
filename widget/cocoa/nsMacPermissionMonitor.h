/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMacPermissionMonitor_h_
#define nsMacPermissionMonitor_h_

#include <CoreLocation/CoreLocation.h>
#include "nsIPermissionMonitor.h"

class nsMacPermissionMonitor : public nsIPermissionMonitor {
 public:
  nsMacPermissionMonitor() : mLocationManager(nullptr) {}

  NS_DECL_ISUPPORTS
  NS_DECL_NSIPERMISSIONMONITOR

 protected:
  virtual ~nsMacPermissionMonitor();

  CLLocationManager* mLocationManager;
};

#endif  // nsMacPermissionMonitor_h_
