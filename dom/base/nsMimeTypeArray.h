/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMimeTypeArray_h_
#define nsMimeTypeArray_h_

#include "mozilla/dom/BindingDeclarations.h"
#include "nsCOMPtr.h"
#include "nsPIDOMWindow.h"
#include "nsTArray.h"
#include "nsWrapperCache.h"

class nsMimeType;
class nsPluginElement;

/**
 * Array class backing HTML's navigator.mimeTypes.  This always holds
 * references to the hard-coded set of PDF MIME types defined by HTML but it
 * only consults them if "pdfjs.disabled" is false.  There is never more
 * than one of these per DOM window.
 */
class nsMimeTypeArray final : public nsISupports, public nsWrapperCache {
 public:
  nsMimeTypeArray(nsPIDOMWindowInner* aWindow,
                  const mozilla::Array<RefPtr<nsMimeType>, 2>& aMimeTypes);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS_FINAL
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(nsMimeTypeArray)

  nsPIDOMWindowInner* GetParentObject() const;
  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // MimeTypeArray WebIDL methods
  uint32_t Length() { return ForceNoPlugins() ? 0 : std::size(mMimeTypes); }

  nsMimeType* Item(uint32_t aIndex) {
    bool unused;
    return IndexedGetter(aIndex, unused);
  }

  nsMimeType* NamedItem(const nsAString& aName) {
    bool unused;
    return NamedGetter(aName, unused);
  }

  nsMimeType* IndexedGetter(uint32_t index, bool& found);

  nsMimeType* NamedGetter(const nsAString& name, bool& found);

  void GetSupportedNames(nsTArray<nsString>& retval);

 protected:
  ~nsMimeTypeArray();

  bool ForceNoPlugins();

  nsCOMPtr<nsPIDOMWindowInner> mWindow;
  mozilla::Array<RefPtr<nsMimeType>, 2> mMimeTypes;
};

/**
 * Mime type class backing entries in HTML's navigator.mimeTypes array.  There
 * is a fixed set of these, as defined by HTML.
 */
class nsMimeType final : public nsWrapperCache {
 public:
  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(nsMimeType)
  NS_DECL_CYCLE_COLLECTION_NATIVE_WRAPPERCACHE_CLASS(nsMimeType)

  nsMimeType(nsPluginElement* aPluginElement, const nsAString& aName);

  nsPluginElement* GetParentObject() const { return mPluginElement; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // MimeType WebIDL methods
  void GetDescription(mozilla::dom::DOMString& retval) const {
    retval.AssignLiteral(u"Portable Document Format");
  }

  already_AddRefed<nsPluginElement> EnabledPlugin() const;

  void GetSuffixes(mozilla::dom::DOMString& retval) const {
    retval.AssignLiteral(u"pdf");
  }

  void GetType(nsString& retval) const { retval = mName; }
  const nsString& Name() const { return mName; }

 protected:
  ~nsMimeType();

  // Note that this creates an explicit reference cycle:
  //
  // nsMimeType -> nsPluginElement -> nsPluginArray ->
  //    nsMimeTypeArray -> nsMimeType
  //
  // We rely on the cycle collector to break this cycle.
  RefPtr<nsPluginElement> mPluginElement;
  nsString mName;
};

#endif /* nsMimeTypeArray_h_ */
