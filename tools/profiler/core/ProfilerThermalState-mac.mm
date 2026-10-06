/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/ProfilerMarkers.h"
#include "mozilla/ProfilerState.h"
#include <Foundation/Foundation.h>

static nsLiteralCString ThermalStateToString(NSProcessInfoThermalState state) {
  switch (state) {
    case NSProcessInfoThermalStateNominal:
      return "Nominal"_ns;
    case NSProcessInfoThermalStateFair:
      return "Fair"_ns;
    case NSProcessInfoThermalStateSerious:
      return "Serious"_ns;
    case NSProcessInfoThermalStateCritical:
      return "Critical"_ns;
    default:
      return "Unknown"_ns;
  }
}

static void AddThermalStateMarker() {
  NSProcessInfoThermalState state = [[NSProcessInfo processInfo] thermalState];
  PROFILER_MARKER_TEXT(
      "Thermal State", OTHER,
      mozilla::MarkerOptions(mozilla::MarkerThreadId::MainThread()),
      ThermalStateToString(state));
}

static id<NSObject> gThermalObserver = nil;

static void ThermalStateCallback(ProfilingState aProfilingState) {
  if (aProfilingState == ProfilingState::Started) {
    if (gThermalObserver) {
      return;  // Already registered
    }

    // Add marker for current thermal state
    AddThermalStateMarker();

    // Register for thermal state change notifications
    gThermalObserver = [[NSNotificationCenter defaultCenter]
        addObserverForName:NSProcessInfoThermalStateDidChangeNotification
                    object:nil
                     queue:nil
                usingBlock:^(NSNotification* note) {
                  AddThermalStateMarker();
                }];
  } else if (aProfilingState == ProfilingState::Pausing) {
    // Add marker but keep observer active
    AddThermalStateMarker();
  } else if (aProfilingState == ProfilingState::Stopping) {
    if (!gThermalObserver) {
      return;
    }

    // Add final marker for thermal state
    AddThermalStateMarker();

    [[NSNotificationCenter defaultCenter] removeObserver:gThermalObserver];
    gThermalObserver = nil;
  }
}

void profiler_register_thermal_state_observer() {
  profiler_add_state_change_callback(
      AllProfilingStates(),
      [](ProfilingState aProfilingState) {
        ThermalStateCallback(aProfilingState);
      },
      0);
}
