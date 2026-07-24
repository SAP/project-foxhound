/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_Clipboard_h_
#define mozilla_dom_Clipboard_h_

#include "mozilla/DOMEventTargetHelper.h"
#include "mozilla/Logging.h"
#include "nsString.h"
#include "nsStringFwd.h"

class nsIClipboardDataSnapshot;

namespace mozilla::dom {

class Promise;
class ClipboardItem;

// https://www.w3.org/TR/clipboard-apis/#clipboard-interface
class Clipboard : public DOMEventTargetHelper {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(Clipboard, DOMEventTargetHelper)

  IMPL_EVENT_HANDLER(message)
  IMPL_EVENT_HANDLER(messageerror)

  explicit Clipboard(nsPIDOMWindowInner* aWindow);
  already_AddRefed<Promise> Read(nsIPrincipal& aSubjectPrincipal,
                                 ErrorResult& aRv);
  already_AddRefed<Promise> ReadText(nsIPrincipal& aSubjectPrincipal,
                                     ErrorResult& aRv);
  already_AddRefed<Promise> Write(
      const Sequence<OwningNonNull<ClipboardItem>>& aData,
      nsIPrincipal& aSubjectPrincipal, ErrorResult& aRv);
  already_AddRefed<Promise> WriteText(const nsAString& aData,
                                      nsIPrincipal& aSubjectPrincipal,
                                      ErrorResult& aRv);

  static LogModule* GetClipboardLog();

  static Span<const nsLiteralCString> MandatoryDataTypes();

  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

 private:
  enum class ReadRequestType {
    eRead,
    eReadText,
  };

  // Checks if dom.events.testing.asyncClipboard pref is enabled.
  // The aforementioned pref allows automated tests to bypass the security
  // checks when writing to
  //  or reading from the clipboard.
  static bool IsTestingPrefEnabled();

  static bool IsTestingPrefEnabledOrHasReadPermission(
      nsIPrincipal& aSubjectPrincipal);

  already_AddRefed<Promise> ReadHelper(nsIPrincipal& aSubjectPrincipal,
                                       ReadRequestType aType, ErrorResult& aRv);

  ~Clipboard();

  void RequestRead(Promise* aPromise, ReadRequestType aType,
                   nsPIDOMWindowInner* aOwner, nsIPrincipal& aPrincipal);

  void RequestRead(Promise& aPromise, const ReadRequestType& aType,
                   nsPIDOMWindowInner& aOwner, nsIPrincipal& aSubjectPrincipal,
                   nsIClipboardDataSnapshot& aRequest);
};

}  // namespace mozilla::dom
#endif  // mozilla_dom_Clipboard_h_
