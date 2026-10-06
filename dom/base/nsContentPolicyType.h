/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsContentPolicyType_h
#define nsContentPolicyType_h

#include "nsIContentPolicy.h"

// This enumerates all nsContentPolicyType values except TYPE_INVALID.
#define FOR_EACH_CONTENT_POLICY_TYPE(NAME)        \
  NAME(TYPE_OTHER)                                \
  NAME(TYPE_SCRIPT)                               \
  NAME(TYPE_IMAGE)                                \
  NAME(TYPE_STYLESHEET)                           \
  NAME(TYPE_OBJECT)                               \
  NAME(TYPE_DOCUMENT)                             \
  NAME(TYPE_SUBDOCUMENT)                          \
  NAME(TYPE_PING)                                 \
  NAME(TYPE_XMLHTTPREQUEST)                       \
  NAME(TYPE_DTD)                                  \
  NAME(TYPE_FONT)                                 \
  NAME(TYPE_MEDIA)                                \
  NAME(TYPE_WEBSOCKET)                            \
  NAME(TYPE_CSP_REPORT)                           \
  NAME(TYPE_XSLT)                                 \
  NAME(TYPE_BEACON)                               \
  NAME(TYPE_FETCH)                                \
  NAME(TYPE_IMAGESET)                             \
  NAME(TYPE_WEB_MANIFEST)                         \
  NAME(TYPE_INTERNAL_SCRIPT)                      \
  NAME(TYPE_INTERNAL_WORKER)                      \
  NAME(TYPE_INTERNAL_SHARED_WORKER)               \
  NAME(TYPE_INTERNAL_EMBED)                       \
  NAME(TYPE_INTERNAL_OBJECT)                      \
  NAME(TYPE_INTERNAL_FRAME)                       \
  NAME(TYPE_INTERNAL_IFRAME)                      \
  NAME(TYPE_INTERNAL_AUDIO)                       \
  NAME(TYPE_INTERNAL_VIDEO)                       \
  NAME(TYPE_INTERNAL_TRACK)                       \
  NAME(TYPE_INTERNAL_XMLHTTPREQUEST_ASYNC)        \
  NAME(TYPE_INTERNAL_EVENTSOURCE)                 \
  NAME(TYPE_INTERNAL_SERVICE_WORKER)              \
  NAME(TYPE_INTERNAL_SCRIPT_PRELOAD)              \
  NAME(TYPE_INTERNAL_IMAGE)                       \
  NAME(TYPE_INTERNAL_IMAGE_PRELOAD)               \
  NAME(TYPE_INTERNAL_IMAGE_FAVICON)               \
  NAME(TYPE_INTERNAL_IMAGE_NOTIFICATION)          \
  NAME(TYPE_INTERNAL_STYLESHEET)                  \
  NAME(TYPE_INTERNAL_STYLESHEET_PRELOAD)          \
  NAME(TYPE_INTERNAL_WORKER_IMPORT_SCRIPTS)       \
  NAME(TYPE_SAVEAS_DOWNLOAD)                      \
  NAME(TYPE_SPECULATIVE)                          \
  NAME(TYPE_INTERNAL_MODULE)                      \
  NAME(TYPE_INTERNAL_MODULE_PRELOAD)              \
  NAME(TYPE_INTERNAL_DTD)                         \
  NAME(TYPE_INTERNAL_FORCE_ALLOWED_DTD)           \
  NAME(TYPE_INTERNAL_AUDIOWORKLET)                \
  NAME(TYPE_INTERNAL_PAINTWORKLET)                \
  NAME(TYPE_INTERNAL_FONT_PRELOAD)                \
  NAME(TYPE_INTERNAL_CHROMEUTILS_COMPILED_SCRIPT) \
  NAME(TYPE_INTERNAL_FRAME_MESSAGEMANAGER_SCRIPT) \
  NAME(TYPE_INTERNAL_FETCH_PRELOAD)               \
  NAME(TYPE_UA_FONT)                              \
  NAME(TYPE_INTERNAL_WORKER_STATIC_MODULE)        \
  NAME(TYPE_PROXIED_WEBRTC_MEDIA)                 \
  NAME(TYPE_WEB_IDENTITY)                         \
  NAME(TYPE_WEB_TRANSPORT)                        \
  NAME(TYPE_INTERNAL_XMLHTTPREQUEST_SYNC)         \
  NAME(TYPE_INTERNAL_EXTERNAL_RESOURCE)           \
  NAME(TYPE_JSON)                                 \
  NAME(TYPE_INTERNAL_JSON_PRELOAD)                \
  NAME(TYPE_TEXT)                                 \
  NAME(TYPE_INTERNAL_TEXT_PRELOAD)

#endif  // nsContentPolicyType_h
