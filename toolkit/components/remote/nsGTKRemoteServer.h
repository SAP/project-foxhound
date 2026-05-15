/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _nsGTKRemoteServer_h_
#define _nsGTKRemoteServer_h_

#include <gdk/gdk.h>
#include <gdk/gdkx.h>
#include <gtk/gtk.h>

#include "nsRemoteServer.h"
#include "nsXRemoteServer.h"

class nsGTKRemoteServer final : public nsXRemoteServer {
 public:
  nsGTKRemoteServer() : mServerWindow(nullptr) {}
  ~nsGTKRemoteServer() override { Shutdown(); }

  nsresult Startup(const char* aAppName, const char* aProfileName) override;
  void Shutdown() override;

  static gboolean HandlePropertyChange(GtkWidget* widget,
                                       GdkEventProperty* event,
                                       nsGTKRemoteServer* aData);

 private:
  void HandleCommandsFor(GtkWidget* aWidget);

  GtkWidget* mServerWindow;
};

#endif  // __nsGTKRemoteService_h__
