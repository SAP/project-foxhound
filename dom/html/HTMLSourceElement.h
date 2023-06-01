/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef mozilla_dom_HTMLSourceElement_h
#define mozilla_dom_HTMLSourceElement_h

#include "mozilla/Attributes.h"
#include "nsGenericHTMLElement.h"
#include "mozilla/dom/HTMLMediaElement.h"

class nsAttrValue;

namespace mozilla::dom {

class MediaList;

class HTMLSourceElement final : public nsGenericHTMLElement {
 public:
  explicit HTMLSourceElement(
      already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo);

  // nsISupports
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(HTMLSourceElement,
                                           nsGenericHTMLElement)

  NS_IMPL_FROMNODE_HTML_WITH_TAG(HTMLSourceElement, source)

  nsresult Clone(dom::NodeInfo*, nsINode** aResult) const override;

  // Override BindToTree() so that we can trigger a load when we add a
  // child source element.
  nsresult BindToTree(BindContext&, nsINode& aParent) override;

  void UnbindFromTree(bool aNullParent) override;

  // If this element's media attr matches for its owner document.  Returns true
  // if no media attr was set.
  bool MatchesCurrentMedia();

  // True if a source tag would match the given media attribute for the
  // specified document. Used by the preloader to determine valid <source> tags
  // prior to DOM creation.
  static bool WouldMatchMediaForDocument(const nsAString& aMediaStr,
                                         const Document* aDocument);

  // Return the MediaSource object if any associated with the src attribute
  // when it was set.
  MediaSource* GetSrcMediaSource() { return mSrcMediaSource; };

  // WebIDL
  void GetSrc(nsString& aSrc) { GetURIAttr(nsGkAtoms::src, nullptr, aSrc); }
  void SetSrc(const nsAString& aSrc, nsIPrincipal* aTriggeringPrincipal,
              mozilla::ErrorResult& rv) {
    SetHTMLAttr(nsGkAtoms::src, aSrc, aTriggeringPrincipal, rv);
  }

  nsIPrincipal* GetSrcTriggeringPrincipal() const {
    return mSrcTriggeringPrincipal;
  }

  nsIPrincipal* GetSrcsetTriggeringPrincipal() const {
    return mSrcsetTriggeringPrincipal;
  }

  void GetType(DOMString& aType) { GetHTMLAttr(nsGkAtoms::type, aType); }
  void SetType(const nsAString& aType, ErrorResult& rv) {
    SetHTMLAttr(nsGkAtoms::type, aType, rv);
  }

  void GetSrcset(DOMString& aSrcset) {
    GetHTMLAttr(nsGkAtoms::srcset, aSrcset);
  }
  void SetSrcset(const nsAString& aSrcset, nsIPrincipal* aTriggeringPrincipal,
                 mozilla::ErrorResult& rv) {
    SetHTMLAttr(nsGkAtoms::srcset, aSrcset, aTriggeringPrincipal, rv);
  }

  void GetSizes(DOMString& aSizes) { GetHTMLAttr(nsGkAtoms::sizes, aSizes); }
  void SetSizes(const nsAString& aSizes, mozilla::ErrorResult& rv) {
    SetHTMLAttr(nsGkAtoms::sizes, aSizes, rv);
  }

  void GetMedia(DOMString& aMedia) { GetHTMLAttr(nsGkAtoms::media, aMedia); }
  void SetMedia(const nsAString& aMedia, mozilla::ErrorResult& rv) {
    SetHTMLAttr(nsGkAtoms::media, aMedia, rv);
  }

  uint32_t Width() const {
    return GetDimensionAttrAsUnsignedInt(nsGkAtoms::width, 0);
  }
  void SetWidth(uint32_t aWidth, ErrorResult& aRv) {
    SetUnsignedIntAttr(nsGkAtoms::width, aWidth, 0, aRv);
  }

  uint32_t Height() const {
    return GetDimensionAttrAsUnsignedInt(nsGkAtoms::height, 0);
  }
  void SetHeight(uint32_t aHeight, ErrorResult& aRv) {
    SetUnsignedIntAttr(nsGkAtoms::height, aHeight, 0, aRv);
  }

  const nsMappedAttributes* GetAttributesMappedForImage() const {
    return mMappedAttributesForImage;
  }

  static bool IsAttributeMappedToImages(const nsAtom* aAttribute) {
    return aAttribute == nsGkAtoms::width || aAttribute == nsGkAtoms::height;
  }

 protected:
  virtual ~HTMLSourceElement();

  JSObject* WrapNode(JSContext* aCx,
                     JS::Handle<JSObject*> aGivenProto) override;

 protected:
  virtual nsresult CheckTaintSinkSetAttr(int32_t aNamespaceID, nsAtom* aName,
                                         const nsAString& aValue) override;

  bool ParseAttribute(int32_t aNamespaceID, nsAtom* aAttribute,
                      const nsAString& aValue,
                      nsIPrincipal* aMaybeScriptedPrincipal,
                      nsAttrValue& aResult) override;

  nsresult AfterSetAttr(int32_t aNameSpaceID, nsAtom* aName,
                        const nsAttrValue* aValue, const nsAttrValue* aOldValue,
                        nsIPrincipal* aMaybeScriptedPrincipal,
                        bool aNotify) override;

 private:
  // Generates a new MediaList using the given input
  void UpdateMediaList(const nsAttrValue* aValue);

  void BuildMappedAttributesForImage();

  bool IsInPicture() const {
    return GetParentElement() &&
           GetParentElement()->IsHTMLElement(nsGkAtoms::picture);
  }

  RefPtr<MediaList> mMediaList;
  RefPtr<MediaSource> mSrcMediaSource;

  // The triggering principal for the src attribute.
  nsCOMPtr<nsIPrincipal> mSrcTriggeringPrincipal;

  // The triggering principal for the srcset attribute.
  nsCOMPtr<nsIPrincipal> mSrcsetTriggeringPrincipal;

  // The mapped attributes to HTMLImageElement if we are associated with a
  // <picture> with a valid <img>.
  RefPtr<nsMappedAttributes> mMappedAttributesForImage;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_HTMLSourceElement_h
