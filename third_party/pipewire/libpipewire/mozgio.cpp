/* -*- Mode: C; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=4:tabstop=4:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <glib.h>
#include "mozilla/Types.h"
#include "prlink.h"

#define GET_FUNC(func, lib)                                  \
    func##_fn =                                              \
      (decltype(func##_fn))PR_FindFunctionSymbol(lib, #func) \

struct GUnixFDList;

extern "C" gint
g_unix_fd_list_get(struct GUnixFDList *list,
                   gint index_,
                   GError **error)
{
  static PRLibrary* gioLib = nullptr;
  static bool gioInitialized = false;
  static gint (*g_unix_fd_list_get_fn)(struct GUnixFDList *list,
               gint index_, GError **error) = nullptr;

  if (!gioInitialized) {
    gioInitialized = true;
    gioLib = PR_LoadLibrary("libgio-2.0.so.0");
    if (!gioLib) {
      return -1;
    }
    GET_FUNC(g_unix_fd_list_get, gioLib);
  }

  if (!g_unix_fd_list_get_fn) {
    return -1;
  }

  return g_unix_fd_list_get_fn(list, index_, error);
}
