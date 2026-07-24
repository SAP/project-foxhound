/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "nsContentDLF.h"

#include "DecoderTraits.h"
#include "imgLoader.h"
#include "mozilla/Encoding.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/LoadURIOptionsBinding.h"
#include "nsCOMPtr.h"
#include "nsCRT.h"
#include "nsCharsetSource.h"
#include "nsContentUtils.h"
#include "nsDocShell.h"
#include "nsGenericHTMLElement.h"
#include "nsGkAtoms.h"
#include "nsIDocumentLoaderFactory.h"
#include "nsIDocumentViewer.h"
#include "nsIViewSourceChannel.h"
#include "nsMimeTypes.h"
#include "nsNetUtil.h"
#include "nsNodeInfoManager.h"
#include "nsString.h"

// Factory code for creating variations on html documents

#undef NOISY_REGISTRY

using namespace mozilla;
using mozilla::dom::Document;
using mozilla::dom::ForceMediaDocument;

already_AddRefed<nsIDocumentViewer> NS_NewDocumentViewer();

static const char* const gHTMLTypes[] = {TEXT_HTML, VIEWSOURCE_CONTENT_TYPE,
                                         APPLICATION_XHTML_XML,
                                         APPLICATION_WAPXHTML_XML, 0};

static const char* const gXMLTypes[] = {TEXT_XML,
                                        APPLICATION_XML,
                                        APPLICATION_MATHML_XML,
                                        APPLICATION_RDF_XML,
                                        TEXT_RDF,
                                        0};

static const char* const gSVGTypes[] = {IMAGE_SVG_XML, 0};

static bool IsTypeInList(const nsACString& aType, const char* const aList[]) {
  int32_t typeIndex;
  for (typeIndex = 0; aList[typeIndex]; ++typeIndex) {
    if (aType.Equals(aList[typeIndex])) {
      return true;
    }
  }

  return false;
}

nsresult NS_NewContentDocumentLoaderFactory(
    nsIDocumentLoaderFactory** aResult) {
  MOZ_ASSERT(aResult, "null OUT ptr");
  if (!aResult) {
    return NS_ERROR_NULL_POINTER;
  }
  auto it = MakeRefPtr<nsContentDLF>();
  it.forget(aResult);
  return NS_OK;
}

nsContentDLF::nsContentDLF() = default;

nsContentDLF::~nsContentDLF() = default;

NS_IMPL_ISUPPORTS(nsContentDLF, nsIDocumentLoaderFactory)

enum class CreateDocumentKind { HTML, XML, SVG, Video, Image, None };

static CreateDocumentKind GetCreateDocumentKind(nsACString& aContentType) {
  // HTML or plaintext; both use the same document CID
  if (IsTypeInList(aContentType, gHTMLTypes) ||
      nsContentUtils::IsPlainTextType(aContentType)) {
    return CreateDocumentKind::HTML;
  }

  if (IsTypeInList(aContentType, gXMLTypes)) {
    return CreateDocumentKind::XML;
  }

  if (IsTypeInList(aContentType, gSVGTypes)) {
    return CreateDocumentKind::SVG;
  }

  if (mozilla::DecoderTraits::ShouldHandleMediaType(
          aContentType,
          /* DecoderDoctorDiagnostics* */ nullptr)) {
    return CreateDocumentKind::Video;
  }

  if (imgLoader::SupportImageWithMimeType(aContentType)) {
    return CreateDocumentKind::Image;
  }

  return CreateDocumentKind::None;
}

static nsresult CreateDocument(const char* aCommand, nsIChannel* aChannel,
                               nsILoadGroup* aLoadGroup,
                               nsIDocShell* aContainer,
                               CreateDocumentKind aKind,
                               nsIStreamListener** aDocListener,
                               nsIDocumentViewer** aDocumentViewer) {
  // Create the document
  RefPtr<Document> doc;
  nsresult rv;
  switch (aKind) {
    case CreateDocumentKind::HTML:
      rv = NS_NewHTMLDocument(getter_AddRefs(doc), nullptr, nullptr);
      break;
    case CreateDocumentKind::XML:
      rv = NS_NewXMLDocument(getter_AddRefs(doc), nullptr, nullptr);
      break;
    case CreateDocumentKind::SVG:
      rv = NS_NewSVGDocument(getter_AddRefs(doc), nullptr, nullptr);
      break;
    case CreateDocumentKind::Video:
      rv = NS_NewVideoDocument(getter_AddRefs(doc), nullptr, nullptr);
      break;
    case CreateDocumentKind::Image:
      rv = NS_NewImageDocument(getter_AddRefs(doc), nullptr, nullptr);
      break;
    case CreateDocumentKind::None:
      MOZ_ASSERT_UNREACHABLE("Invalid kind.");
      rv = NS_ERROR_FAILURE;
      break;
  }
  NS_ENSURE_SUCCESS(rv, rv);

  // Create the content viewer  XXX: could reuse content viewer here!
  nsCOMPtr<nsIDocumentViewer> viewer = NS_NewDocumentViewer();

  doc->SetContainer(static_cast<nsDocShell*>(aContainer));
  doc->SetAllowDeclarativeShadowRoots(true);

  // Initialize the document to begin loading the data.  An
  // nsIStreamListener connected to the parser is returned in
  // aDocListener.
  rv = doc->StartDocumentLoad(aCommand, aChannel, aLoadGroup, aContainer,
                              aDocListener, true);
  NS_ENSURE_SUCCESS(rv, rv);

  // Bind the document to the Content Viewer
  viewer->LoadStart(doc);

  if (aKind != CreateDocumentKind::Image) {
    viewer->GetDocument()->MakeBrowsingContextNonSynthetic();
  }

  viewer.forget(aDocumentViewer);
  return NS_OK;
}

NS_IMETHODIMP
nsContentDLF::CreateInstance(const char* aCommand, nsIChannel* aChannel,
                             nsILoadGroup* aLoadGroup,
                             const nsACString& aContentType,
                             nsIDocShell* aContainer, nsISupports* aExtraInfo,
                             nsIStreamListener** aDocListener,
                             nsIDocumentViewer** aDocViewer) {
  // Make a copy of aContentType, because we're possibly going to change it.
  nsAutoCString contentType(aContentType);

  // Are we viewing source?
  nsCOMPtr<nsIViewSourceChannel> viewSourceChannel =
      do_QueryInterface(aChannel);
  if (viewSourceChannel) {
    aCommand = "view-source";

    // The parser freaks out when it sees the content-type that a
    // view-source channel normally returns.  Get the actual content
    // type of the data.  If it's known, use it; otherwise use
    // text/plain.
    nsAutoCString type;
    (void)viewSourceChannel->GetOriginalContentType(type);
    bool knownType = (!type.EqualsLiteral(VIEWSOURCE_CONTENT_TYPE) &&
                      IsTypeInList(type, gHTMLTypes)) ||
                     nsContentUtils::IsPlainTextType(type) ||
                     IsTypeInList(type, gXMLTypes) ||
                     IsTypeInList(type, gSVGTypes);

    if (knownType) {
      viewSourceChannel->SetContentType(type);
    } else if (imgLoader::SupportImageWithMimeType(type)) {
      // If it's an image, we want to display it the same way we normally would.
      contentType = type;
    } else {
      viewSourceChannel->SetContentType(nsLiteralCString(TEXT_PLAIN));
    }
  } else if (aContentType.EqualsLiteral(VIEWSOURCE_CONTENT_TYPE)) {
    aChannel->SetContentType(nsLiteralCString(TEXT_PLAIN));
    contentType = TEXT_PLAIN;
  }

  nsCOMPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  CreateDocumentKind kind = CreateDocumentKind::None;
  // SVGDocumentWrapper::SetupViewer needs to be able to create a proper SVG
  // document internally even when creating an ImageDocument.
  if ((!aCommand || strcmp(aCommand, "external-resource") != 0) &&
      loadInfo->GetForceMediaDocument() != ForceMediaDocument::None) {
    switch (loadInfo->GetForceMediaDocument()) {
      case dom::ForceMediaDocument::Video:
        kind = CreateDocumentKind::Video;
        break;
      case dom::ForceMediaDocument::Image:
        kind = CreateDocumentKind::Image;
        break;
      case dom::ForceMediaDocument::None:
        MOZ_ASSERT_UNREACHABLE("Can't be None");
        break;
    }
  } else {
    kind = GetCreateDocumentKind(contentType);
  }

  if (kind == CreateDocumentKind::None) {
    // We can't handle this content type. Sorry!
    return NS_ERROR_FAILURE;
  }

  return CreateDocument(aCommand, aChannel, aLoadGroup, aContainer, kind,
                        aDocListener, aDocViewer);
}

NS_IMETHODIMP
nsContentDLF::CreateInstanceForDocument(nsISupports* aContainer,
                                        Document* aDocument,
                                        const char* aCommand,
                                        nsIDocumentViewer** aDocumentViewer) {
  MOZ_ASSERT(aDocument);

  nsCOMPtr<nsIDocumentViewer> viewer = NS_NewDocumentViewer();

  // Bind the document to the Content Viewer
  viewer->LoadStart(aDocument);
  viewer.forget(aDocumentViewer);
  return NS_OK;
}

/* static */
already_AddRefed<Document> nsContentDLF::CreateBlankDocument(
    nsILoadGroup* aLoadGroup, nsIPrincipal* aPrincipal,
    nsIPrincipal* aPartitionedPrincipal, nsDocShell* aContainer) {
  // create a new blank HTML document
  RefPtr<Document> blankDoc;
  (void)NS_NewHTMLDocument(getter_AddRefs(blankDoc), nullptr, nullptr);

  if (!blankDoc) {
    return nullptr;
  }

  // initialize
  nsCOMPtr<nsIURI> uri;
  NS_NewURI(getter_AddRefs(uri), "about:blank"_ns);
  if (!uri) {
    return nullptr;
  }
  blankDoc->ResetToURI(uri, aLoadGroup, aPrincipal, aPartitionedPrincipal);
  blankDoc->SetContainer(aContainer);

  blankDoc->SetAllowDeclarativeShadowRoots(true);

  // add some simple content structure
  nsNodeInfoManager* nim = blankDoc->NodeInfoManager();

  RefPtr<mozilla::dom::NodeInfo> htmlNodeInfo;

  // generate an html html element
  htmlNodeInfo = nim->GetNodeInfo(nsGkAtoms::html, 0, kNameSpaceID_XHTML,
                                  nsINode::ELEMENT_NODE);
  nsCOMPtr<nsIContent> htmlElement =
      NS_NewHTMLHtmlElement(htmlNodeInfo.forget());

  // generate an html head element
  htmlNodeInfo = nim->GetNodeInfo(nsGkAtoms::head, 0, kNameSpaceID_XHTML,
                                  nsINode::ELEMENT_NODE);
  nsCOMPtr<nsIContent> headElement =
      NS_NewHTMLHeadElement(htmlNodeInfo.forget());

  // generate an html body elemment
  htmlNodeInfo = nim->GetNodeInfo(nsGkAtoms::body, 0, kNameSpaceID_XHTML,
                                  nsINode::ELEMENT_NODE);
  nsCOMPtr<nsIContent> bodyElement =
      NS_NewHTMLBodyElement(htmlNodeInfo.forget());

  // blat in the structure
  NS_ASSERTION(blankDoc->GetChildCount() == 0, "Shouldn't have children");
  if (!htmlElement || !headElement || !bodyElement) {
    return nullptr;
  }

  mozilla::IgnoredErrorResult rv;
  blankDoc->AppendChildTo(htmlElement, false, rv);
  if (rv.Failed()) {
    return nullptr;
  }

  htmlElement->AppendChildTo(headElement, false, rv);
  if (rv.Failed()) {
    return nullptr;
  }

  // XXXbz Why not notifying here?
  htmlElement->AppendChildTo(bodyElement, false, rv);
  if (rv.Failed()) {
    return nullptr;
  }

  // add a nice bow
  blankDoc->SetDocumentCharacterSetSource(kCharsetFromDocTypeDefault);
  blankDoc->SetDocumentCharacterSet(UTF_8_ENCODING);
  return blankDoc.forget();
}
