/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_docshell_message_utils_h_
#define mozilla_dom_docshell_message_utils_h_

#include "ipc/EnumSerializer.h"
#include "mozilla/ScrollbarPreferences.h"
#include "nsCOMPtr.h"
#include "nsDocShellLoadState.h"
#include "nsIDocumentViewer.h"

namespace IPC {

template <>
struct ParamTraits<nsDocShellLoadState*> {
  static void Write(IPC::MessageWriter* aWriter, nsDocShellLoadState* aParam);
  static bool Read(IPC::MessageReader* aReader,
                   RefPtr<nsDocShellLoadState>* aResult);
};

template <>
struct ParamTraits<mozilla::ScrollbarPreference>
    : public ContiguousEnumSerializerInclusive<
          mozilla::ScrollbarPreference, mozilla::ScrollbarPreference::Auto,
          mozilla::ScrollbarPreference::LAST> {};

template <>
struct ParamTraits<mozilla::dom::PermitUnloadResult>
    : public ContiguousEnumSerializerInclusive<
          mozilla::dom::PermitUnloadResult,
          mozilla::dom::PermitUnloadResult::eContinue,
          mozilla::dom::PermitUnloadResult::eCanceledByNavigate> {};

template <>
struct ParamTraits<mozilla::dom::XPCOMPermitUnloadAction>
    : public ContiguousEnumSerializerInclusive<
          mozilla::dom::XPCOMPermitUnloadAction,
          mozilla::dom::XPCOMPermitUnloadAction::ePrompt,
          mozilla::dom::XPCOMPermitUnloadAction::eDontPromptAndUnload> {};

template <>
struct ParamTraits<mozilla::dom::ForceMediaDocument>
    : public ContiguousEnumSerializerInclusive<
          mozilla::dom::ForceMediaDocument,
          mozilla::dom::ForceMediaDocument::None,
          mozilla::dom::ForceMediaDocument::Video> {};

}  // namespace IPC

#endif  // mozilla_dom_docshell_message_utils_h_
