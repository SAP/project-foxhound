/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsHTMLFormatConverter.h"

#include "nsArray.h"
#include "nsCRT.h"
#include "nsCOMPtr.h"
#include "nsITransferable.h"
#include "nsLiteralString.h"
#include "nsXPCOM.h"
#include "nsISupportsPrimitives.h"

// HTML convertor stuff
#include "nsPrimitiveHelpers.h"
#include "nsIDocumentEncoder.h"
#include "nsContentUtils.h"

nsHTMLFormatConverter::nsHTMLFormatConverter() = default;

nsHTMLFormatConverter::~nsHTMLFormatConverter() = default;

NS_IMPL_ISUPPORTS(nsHTMLFormatConverter, nsIFormatConverter)

//
// GetInputDataFlavors
//
// Creates a new list and returns the list of all the flavors this converter
// knows how to import. In this case, it's just HTML.
//
NS_IMETHODIMP
nsHTMLFormatConverter::GetInputDataFlavors(nsTArray<nsCString>& aFlavors) {
  aFlavors.AppendElement(nsLiteralCString(kHTMLMime));
  return NS_OK;
}

//
// GetOutputDataFlavors
//
// Creates a new list and returns the list of all the flavors this converter
// knows how to export (convert). In this case, it's all sorts of things that
// HTML can be converted to.
//
NS_IMETHODIMP
nsHTMLFormatConverter::GetOutputDataFlavors(nsTArray<nsCString>& aFlavors) {
  aFlavors.AppendElement(nsLiteralCString(kHTMLMime));
  aFlavors.AppendElement(nsLiteralCString(kTextMime));
  return NS_OK;
}

//
// CanConvert
//
// Determines if we support the given conversion. Currently, this method only
// converts from HTML to others.
//
NS_IMETHODIMP
nsHTMLFormatConverter::CanConvert(const char* aFromDataFlavor,
                                  const char* aToDataFlavor, bool* _retval) {
  if (!_retval) return NS_ERROR_INVALID_ARG;

  *_retval = false;
  if (!nsCRT::strcmp(aFromDataFlavor, kHTMLMime)) {
    if (!nsCRT::strcmp(aToDataFlavor, kHTMLMime)) {
      *_retval = true;
    } else if (!nsCRT::strcmp(aToDataFlavor, kTextMime)) {
      *_retval = true;
    }
  }
  return NS_OK;

}  // CanConvert

//
// Convert
//
// Convert data from one flavor to another. The data is wrapped in primitive
// objects so that it is accessible from JS. Currently, this only accepts HTML
// input, so anything else is invalid.
//
// XXX This method copies the data WAAAAY too many time for my liking. Grrrrrr.
// Mostly it's because
// XXX we _must_ put things into nsStrings so that the parser will accept it.
// Lame lame lame lame. We
// XXX also can't just get raw unicode out of the nsString, so we have to
// allocate heap to get
// XXX unicode out of the string. Lame lame lame.
//
NS_IMETHODIMP
nsHTMLFormatConverter::Convert(const char* aFromDataFlavor,
                               nsISupports* aFromData,
                               const char* aToDataFlavor,
                               nsISupports** aToData) {
  if (!aToData) {
    return NS_ERROR_INVALID_ARG;
  }

  *aToData = nullptr;

  if (!nsCRT::strcmp(aFromDataFlavor, kHTMLMime)) {
    nsAutoCString toFlavor(aToDataFlavor);

    // HTML on clipboard is going to always be double byte so it will be in a
    // primitive class of nsISupportsString. Also, since the data is in two byte
    // chunks the length represents the length in 1-byte chars, so we need to
    // divide by two.
    nsCOMPtr<nsISupportsString> dataWrapper0(do_QueryInterface(aFromData));
    if (!dataWrapper0) {
      return NS_ERROR_INVALID_ARG;
    }

    nsAutoString dataStr;
    dataWrapper0->GetData(dataStr);
    // note: conversion to text/plain is done inside the clipboard. we do not
    // need to worry about it here.
    if (toFlavor.Equals(kHTMLMime) || toFlavor.Equals(kTextMime)) {
      nsAutoString outStr = dataStr;

      if (toFlavor.Equals(kTextMime)) {
        nsresult res = ConvertFromHTMLToUnicode(dataStr, outStr);
        if (NS_FAILED(res)) {
          return NS_ERROR_FAILURE;
        }
      }

      auto len = outStr.Length();
      if (len > std::numeric_limits<size_t>::max() / 2) {
        return NS_ERROR_FAILURE;
      }
      size_t dataLen = len * 2;
      nsPrimitiveHelpers::CreatePrimitiveForData(toFlavor, outStr.get(),
                                                 dataLen, aToData);
      return NS_OK;
    }
  }

  return NS_ERROR_FAILURE;
}

//
// ConvertFromHTMLToUnicode
//
// Takes HTML and converts it to plain text but in unicode.
//
NS_IMETHODIMP
nsHTMLFormatConverter::ConvertFromHTMLToUnicode(const nsAutoString& aFromStr,
                                                nsAutoString& aToStr) {
  return nsContentUtils::ConvertToPlainText(
      aFromStr, aToStr,
      nsIDocumentEncoder::OutputSelectionOnly |
          nsIDocumentEncoder::OutputAbsoluteLinks |
          nsIDocumentEncoder::OutputNoScriptContent |
          nsIDocumentEncoder::OutputNoFramesContent,
      0);
}  // ConvertFromHTMLToUnicode

NS_IMETHODIMP
nsHTMLFormatConverter::ConvertFromHTMLToAOLMail(const nsAutoString& aFromStr,
                                                nsAutoString& aToStr) {
  aToStr.AssignLiteral("<HTML>");
  aToStr.Append(aFromStr);
  aToStr.AppendLiteral("</HTML>");

  return NS_OK;
}
