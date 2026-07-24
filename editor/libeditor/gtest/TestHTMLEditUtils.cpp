/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/BasePrincipal.h"
#include "mozilla/OriginAttributes.h"
#include "mozilla/dom/CDATASection.h"
#include "mozilla/dom/Comment.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Text.h"
#include "EditorDOMPoint.h"
#include "HTMLEditUtils.h"
#include "nsCOMPtr.h"
#include "nsGenericHTMLElement.h"
#include "nsIURI.h"
#include "nsNetUtil.h"
#include "nsString.h"
#include "nsTextNode.h"

namespace mozilla {

using namespace dom;

using AncestorType = HTMLEditUtils::AncestorType;
using AncestorTypes = HTMLEditUtils::AncestorTypes;
using EditablePointOption = HTMLEditUtils::EditablePointOption;
using EditablePointOptions = HTMLEditUtils::EditablePointOptions;

static already_AddRefed<Document> CreateHTMLDoc() {
  nsCOMPtr<nsIURI> uri;
  NS_NewURI(getter_AddRefs(uri), "data:text/html,");

  RefPtr<BasePrincipal> principal =
      BasePrincipal::CreateContentPrincipal(uri, OriginAttributes());
  MOZ_RELEASE_ASSERT(principal);

  nsCOMPtr<Document> doc;
  MOZ_ALWAYS_SUCCEEDS(NS_NewDOMDocument(getter_AddRefs(doc),
                                        u""_ns,   // aNamespaceURI
                                        u""_ns,   // aQualifiedName
                                        nullptr,  // aDoctype
                                        uri, uri, principal,
                                        LoadedAsData::No,  // aLoadedAsData
                                        nullptr,           // aEventObject
                                        DocumentFlavor::HTML));
  MOZ_RELEASE_ASSERT(doc);

  RefPtr<Element> html = doc->CreateHTMLElement(nsGkAtoms::html);
  html->SetInnerHTMLTrusted(u"<html><head></head><body></body></html>"_ns,
                            principal, IgnoreErrors());
  doc->AppendChild(*html, IgnoreErrors());

  return doc.forget();
}

struct MOZ_STACK_CLASS DeepestEditablePointTest final {
  const char16_t* const mInnerHTML;
  const char* const mContentSelector;
  const EditablePointOptions mOptions;
  const char* const mExpectedContainerSelector;
  const char16_t* const mExpectedTextData;
  const uint32_t mExpectedOffset;

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const DeepestEditablePointTest& aTest) {
    return aStream << "Scan \"" << aTest.mContentSelector
                   << "\" with options=" << ToString(aTest.mOptions).c_str()
                   << " in \"" << NS_ConvertUTF16toUTF8(aTest.mInnerHTML).get()
                   << "\"";
  }
};

TEST(HTMLEditUtilsTest, GetDeepestEditableStartPointOf)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           DeepestEditablePointTest{
               u"<div contenteditable><div><br></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><img></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <img>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><hr></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <hr>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc</div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               u"abc",
               0  // Find "a"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><p>abc</p></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > p",
               u"abc",
               0  // Find "a"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><span>abc</span></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > span",
               u"abc",
               0  // Find "a"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>   abc</div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               u"   abc",
               3  // Find "a"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><span>   abc</span></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > span",
               u"   abc",
               3  // Find "a"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>   abc</div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::RecognizeInvisibleWhiteSpaces},
               "div[contenteditable] > div",
               u"   abc",
               0  // Find the first white-space
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><span>   abc</span></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::RecognizeInvisibleWhiteSpaces},
               "div[contenteditable] > div > span",
               u"   abc",
               0  // Find the first white-space
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><span></span>abc</div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > span",
               nullptr,
               0  // Find the empty <span>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><!-- comment -->abc</div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               u"abc",
               0  // Find "a"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><!-- comment -->abc</div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtComment},
               "div[contenteditable] > div",
               nullptr,
               0  // Find the comment
           },
           // inline-block may have leading white-spaces.  Therefore, even if
           // the start container is an inline element which follows visible
           // characters, it should return the first visible character in the
           // inline-block.
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc<b><span style=\"display: "
               u"inline-block\">   def</span></b></div></div>",
               "div[contenteditable] > div > b",
               {},
               "div[contenteditable] > div > b > span",
               u"   def",
               3  // Find "d"
           },
           // There is a child <table>
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] td",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtTableElement},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <table>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtAnyTableElement},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <table>
           },
           // In a table structure
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] table",
               {},
               "div[contenteditable] td",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] table",
               {EditablePointOption::StopAtTableElement},
               "div[contenteditable] td",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] table",
               {EditablePointOption::StopAtAnyTableElement},
               "div[contenteditable] table",
               nullptr,
               0  // Find <td>
           },
           // <ul>
           DeepestEditablePointTest{
               u"<div contenteditable><div><ul><li><br></li></ul></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] li",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ul><li><br></li></ul></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] ul",
               nullptr,
               0  // Find <li>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ul><li><br></li></ul></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <ul>
           },
           // <ol>
           DeepestEditablePointTest{
               u"<div contenteditable><div><ol><li><br></li></ol></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] li",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ol><li><br></li></ol></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] ol",
               nullptr,
               0  // Find <li>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ol><li><br></li></ol></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <ol>
           },
           // <dl> and <dt>
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dt><br></dt></dl></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] dt",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dt><br></dt></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] dl",
               nullptr,
               0  // Find <dt>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dt><br></dt></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <dl>
           },
           // <dl> and <dd>
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dd><br></dd></dl></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] dd",
               nullptr,
               0  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dd><br></dd></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] dl",
               nullptr,
               0  // Find <dd>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dd><br></dd></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               0  // Find <dl>
           },
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const content = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(content);
    const nsIContent* const expectedContainer = [&]() -> const nsIContent* {
      const Element* const containerElement = body->QuerySelector(
          nsDependentCString(testData.mExpectedContainerSelector),
          IgnoreErrors());
      if (!testData.mExpectedTextData) {
        return containerElement;
      }
      for (const nsIContent* child = containerElement->GetFirstChild(); child;
           child = child->GetNextSibling()) {
        if (const auto* text = Text::FromNodeOrNull(child)) {
          nsAutoString data;
          text->GetData(data);
          if (data.Equals(testData.mExpectedTextData)) {
            return text;
          }
        }
      }
      return nullptr;
    }();
    MOZ_RELEASE_ASSERT(expectedContainer);
    const EditorRawDOMPoint result =
        HTMLEditUtils::GetDeepestEditableStartPointOf<EditorRawDOMPoint>(
            *content, testData.mOptions);
    EXPECT_EQ(result.GetContainer(), expectedContainer)
        << testData << "(Got: " << ToString(RefPtr{result.GetContainer()})
        << ")";
    EXPECT_EQ(result.Offset(), testData.mExpectedOffset) << testData;
  }
}

TEST(HTMLEditUtilsTest, GetDeepestEditableEndPointOf)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           DeepestEditablePointTest{
               u"<div contenteditable><div><br></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               nullptr,
               // XXX Should be 0 due to an invisible <br>?
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><img></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <img>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><hr></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <hr>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc</div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               u"abc",
               3  // Find "c"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><p>abc</p></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > p",
               u"abc",
               3  // Find "c"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><span>abc</span></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > span",
               u"abc",
               3  // Find "c"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc   </div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               u"abc   ",
               3  // Find "c"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><span>abc   </span></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > span",
               u"abc   ",
               3  // Find "a"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc   </div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::RecognizeInvisibleWhiteSpaces},
               "div[contenteditable] > div",
               u"abc   ",
               6  // Find the last white-space
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><span>abc   </span></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::RecognizeInvisibleWhiteSpaces},
               "div[contenteditable] > div > span",
               u"abc   ",
               6  // Find the last white-space
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc<span></span></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div > span",
               nullptr,
               0  // Find the empty <span>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc<!-- comment --></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] > div",
               u"abc",
               3  // Find "c"
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div>abc<!-- comment --></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtComment},
               "div[contenteditable] > div",
               nullptr,
               2  // Find the comment
           },
           // inline-block may have leading white-spaces.  Therefore, even if
           // the start container is an inline element which is followed by
           // visible characters, it should return the last visible character
           // in the inline-block.
           DeepestEditablePointTest{
               u"<div contenteditable><div><b><span style=\"display: "
               u"inline-block\">abc   </span></b>def</div></div>",
               "div[contenteditable] > div > b",
               {},
               "div[contenteditable] > div > b > span",
               u"abc   ",
               3  // Find "c"
           },
           // There is a child <table>
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] td",
               nullptr,
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtTableElement},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <table>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtAnyTableElement},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <table>
           },
           // In a table structure
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] table",
               {},
               "div[contenteditable] td",
               nullptr,
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] table",
               {EditablePointOption::StopAtTableElement},
               "div[contenteditable] td",
               nullptr,
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><table><td><br></table></div></div>",
               "div[contenteditable] table",
               {EditablePointOption::StopAtAnyTableElement},
               "div[contenteditable] table",
               nullptr,
               1  // Find <td>
           },
           // <ul>
           DeepestEditablePointTest{
               u"<div contenteditable><div><ul><li><br></li></ul></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] li",
               nullptr,
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ul><li><br></li></ul></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] ul",
               nullptr,
               1  // Find <li>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ul><li><br></li></ul></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <ul>
           },
           // <ol>
           DeepestEditablePointTest{
               u"<div contenteditable><div><ol><li><br></li></ol></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] li",
               nullptr,
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ol><li><br></li></ol></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] ol",
               nullptr,
               1  // Find <li>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><ol><li><br></li></ol></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <ol>
           },
           // <dl> and <dt>
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dt><br></dt></dl></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] dt",
               nullptr,
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dt><br></dt></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] dl",
               nullptr,
               1  // Find <dt>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dt><br></dt></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <dl>
           },
           // <dl> and <dd>
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dd><br></dd></dl></div></div>",
               "div[contenteditable] > div",
               {},
               "div[contenteditable] dd",
               nullptr,
               1  // Find <br>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dd><br></dd></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListItemElement},
               "div[contenteditable] dl",
               nullptr,
               1  // Find <dd>
           },
           DeepestEditablePointTest{
               u"<div contenteditable><div><dl><dd><br></dd></dl></div></div>",
               "div[contenteditable] > div",
               {EditablePointOption::StopAtListElement},
               "div[contenteditable] > div",
               nullptr,
               1  // Find <dl>
           },
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const content = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(content);
    const nsIContent* const expectedContainer = [&]() -> const nsIContent* {
      const Element* const containerElement = body->QuerySelector(
          nsDependentCString(testData.mExpectedContainerSelector),
          IgnoreErrors());
      if (!testData.mExpectedTextData) {
        return containerElement;
      }
      for (const nsIContent* child = containerElement->GetLastChild(); child;
           child = child->GetPreviousSibling()) {
        if (const auto* text = Text::FromNodeOrNull(child)) {
          nsAutoString data;
          text->GetData(data);
          if (data.Equals(testData.mExpectedTextData)) {
            return text;
          }
        }
      }
      return nullptr;
    }();
    MOZ_RELEASE_ASSERT(expectedContainer);
    const EditorRawDOMPoint result =
        HTMLEditUtils::GetDeepestEditableEndPointOf<EditorRawDOMPoint>(
            *content, testData.mOptions);
    EXPECT_EQ(result.GetContainer(), expectedContainer)
        << testData << "(Got: " << ToString(RefPtr{result.GetContainer()})
        << ")";
    EXPECT_EQ(result.Offset(), testData.mExpectedOffset) << testData;
  }
}

struct MOZ_STACK_CLASS AncestorElementTest final {
  const char16_t* const mInnerHTML;
  const char* const mContentSelector;
  const AncestorTypes mAncestorTypes;
  const char* const mAncestorLimiterSelector;
  const char* const mExpectedSelectorForAncestor;
  const char* const mExpectedSelectorForInclusiveAncestor;

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const AncestorElementTest& aTest) {
    return aStream << "Scan from \"" << aTest.mContentSelector
                   << "\" with ancestor types="
                   << ToString(aTest.mAncestorTypes).c_str() << " in \""
                   << NS_ConvertUTF16toUTF8(aTest.mInnerHTML).get() << "\"";
  }
};

TEST(HTMLEditUtilsTest, GetAncestorElement_ClosestBlockElement)
{
  using AncestorType = HTMLEditUtils::AncestorType;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           AncestorElementTest{
               u"<div contenteditable><div><span><div><span><br>"
               u"</span></div></span></div></div>",
               "[contenteditable] > div > span > div > span",
               {AncestorType::ClosestBlockElement},
               "[contenteditable]",
               "[contenteditable] > div > span > div",
               "[contenteditable] > div > span > div"},
           AncestorElementTest{
               u"<div contenteditable><div><span><div><span><br>"
               u"</span></div></span></div></div>",
               "[contenteditable] > div > span > div",
               {AncestorType::ClosestBlockElement},
               "[contenteditable]",
               "[contenteditable] > div",
               "[contenteditable] > div > span > div"},
           AncestorElementTest{
               u"<div contenteditable><div><span><br></span></div></div>",
               "[contenteditable] > div",
               {AncestorType::ClosestBlockElement},
               "[contenteditable]",
               // Should return the editing host because of the closest ancestor
               // of the deepest <div>.
               "[contenteditable]",
               "[contenteditable] > div"},
           AncestorElementTest{
               u"<div contenteditable><span><br></span></div>",
               "[contenteditable] > span",
               {AncestorType::ClosestBlockElement},
               "[contenteditable]",
               // Should return the editing host because of a block.
               "[contenteditable]",
               "[contenteditable]"},
           AncestorElementTest{
               u"<div contenteditable><span><br></span></div>",
               "[contenteditable] > span",
               {AncestorType::ClosestBlockElement,
                AncestorType::ReturnAncestorLimiterIfNoProperAncestor},
               "[contenteditable]",
               "[contenteditable]",
               "[contenteditable]"},
           AncestorElementTest{u"<div contenteditable><span><br></span></div>",
                               "[contenteditable] > span",
                               {AncestorType::ClosestBlockElement,
                                AncestorType::EditableElement},
                               "[contenteditable]",
                               "[contenteditable]",
                               "[contenteditable]"},
           AncestorElementTest{
               u"<div contenteditable><span><br></span></div>",
               "[contenteditable] > span",
               {AncestorType::ClosestBlockElement,
                AncestorType::EditableElement,
                AncestorType::ReturnAncestorLimiterIfNoProperAncestor},
               "[contenteditable]",
               "[contenteditable]",
               "[contenteditable]"},
           AncestorElementTest{
               u"<span contenteditable><span><br></span></span>",
               "[contenteditable] > span",
               {AncestorType::ClosestBlockElement,
                AncestorType::EditableElement,
                AncestorType::ReturnAncestorLimiterIfNoProperAncestor},
               "[contenteditable]",
               // Should return the inline editing host because of the ancestor
               // limiter.
               "[contenteditable]",
               "[contenteditable]"},
           AncestorElementTest{
               u"<span contenteditable><span><br></span></span>",
               "[contenteditable] > span",
               {AncestorType::ClosestBlockElement,
                AncestorType::EditableElement},
               "[contenteditable]",
               // Should not return the body because of not editable.
               nullptr,
               nullptr},
           AncestorElementTest{
               u"<div><span contenteditable><br></span>",
               "[contenteditable]",
               {AncestorType::ClosestBlockElement,
                AncestorType::EditableElement,
                AncestorType::ReturnAncestorLimiterIfNoProperAncestor},
               "div",  // parent of the editing host
               // nullptr because of starting to scan from non-editable element.
               nullptr,
               // the editing host.
               "[contenteditable]",
           },
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const content = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(content);
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForAncestor
              ? body->QuerySelector(
                    nsDependentCString(testData.mExpectedSelectorForAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForInclusiveAncestor
              ? body->QuerySelector(
                    nsDependentCString(
                        testData.mExpectedSelectorForInclusiveAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetInclusiveAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetInclusiveAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
  }
}

TEST(HTMLEditUtilsTest, GetAncestorElement_MostDistantInlineElementInBlock)
{
  using AncestorType = HTMLEditUtils::AncestorType;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           AncestorElementTest{
               u"<div contenteditable><span><br></span></div>",
               "[contenteditable] > span",
               {AncestorType::MostDistantInlineElementInBlock,
                AncestorType::EditableElement,
                AncestorType::ReturnAncestorLimiterIfNoProperAncestor},
               "[contenteditable]",
               // Should return the editing host because of editable.
               "[contenteditable]",
               "[contenteditable] > span"},
           AncestorElementTest{
               u"<div contenteditable><b><i><div><u><s><br>"
               u"</s></u></div></i></b></div>",
               "[contenteditable] s",
               {AncestorType::MostDistantInlineElementInBlock},
               "[contenteditable]",
               // Should return the <u> because of the deepest <div>.
               "[contenteditable] u",
               "[contenteditable] u"},
           AncestorElementTest{u"<div contenteditable><b><i><div><u><s><br>"
                               u"</s></u></div></i></b></div>",
                               "[contenteditable] u",
                               {AncestorType::MostDistantInlineElementInBlock},
                               "[contenteditable]",
                               // Should return nullptr because of no ancestor
                               // in the deepest <div>.
                               nullptr,
                               "[contenteditable] u"},
           AncestorElementTest{
               u"<div contenteditable><b><i><div><u><s><br>"
               u"</s></u></div></i></b></div>",
               "[contenteditable] div",
               {AncestorType::MostDistantInlineElementInBlock},
               "[contenteditable]",
               "[contenteditable] b",
               // Should return nullptr because of starting from the <div>.
               nullptr},
           AncestorElementTest{
               u",<s><span contenteditable><b><i><br></i></b></span></s>",
               "[contenteditable] i",
               {AncestorType::MostDistantInlineElementInBlock},
               "[contenteditable]",
               // Should return the editing host because of inline.
               "[contenteditable]",
               "[contenteditable]"},
           AncestorElementTest{
               u"<s><span contenteditable><b><i><br></i></b></span></s>",
               "[contenteditable] i",
               {AncestorType::MostDistantInlineElementInBlock,
                AncestorType::ReturnAncestorLimiterIfNoProperAncestor},
               "[contenteditable]",
               // Should return the editing host because of inline.
               "[contenteditable]",
               "[contenteditable]"},
           AncestorElementTest{
               u"<s><span contenteditable><b><i><br></i></b></span></s>",
               "[contenteditable] i",
               {AncestorType::MostDistantInlineElementInBlock,
                AncestorType::EditableElement},
               nullptr,
               // Should return the editing host because of the editable root.
               "[contenteditable]",
               "[contenteditable]"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const content = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(content);
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForAncestor
              ? body->QuerySelector(
                    nsDependentCString(testData.mExpectedSelectorForAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForInclusiveAncestor
              ? body->QuerySelector(
                    nsDependentCString(
                        testData.mExpectedSelectorForInclusiveAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetInclusiveAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetInclusiveAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
  }
}

TEST(HTMLEditUtilsTest, GetAncestorElement_ButtonElement)
{
  using AncestorType = HTMLEditUtils::AncestorType;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           AncestorElementTest{
               u"<div contenteditable><button><span><br></span></button></div>",
               "[contenteditable] > button > span",
               {AncestorType::ClosestBlockElement,
                AncestorType::ClosestButtonElement},
               "[contenteditable]",
               "[contenteditable] > button",
               "[contenteditable] > button"},
           AncestorElementTest{
               u"<div contenteditable><button><br></button></div>",
               "[contenteditable] > button",
               {AncestorType::ClosestBlockElement,
                AncestorType::ClosestButtonElement},
               "[contenteditable]",
               "[contenteditable]",
               "[contenteditable] > button"},
           AncestorElementTest{
               u"<div contenteditable><b><button><i><br>"
               u"</i></button></b></div>",
               "[contenteditable] button > i",
               {AncestorType::MostDistantInlineElementInBlock,
                AncestorType::StopAtClosestButtonElement},
               "[contenteditable]",
               // because of no inline elements between <button> and <i>.
               nullptr,
               "[contenteditable] button > i"},
           AncestorElementTest{u"<div contenteditable><b><button><i><u><br>"
                               u"</u></i></button></b></div>",
                               "[contenteditable] button > i > u",
                               {AncestorType::MostDistantInlineElementInBlock,
                                AncestorType::StopAtClosestButtonElement},
                               "[contenteditable]",
                               // because of <i> is a child of <button>.
                               "i",
                               "i"},
           AncestorElementTest{u"<div contenteditable><b><button><i><br>"
                               u"</i></button></b></div>",
                               "[contenteditable] button > i",
                               {AncestorType::MostDistantInlineElementInBlock,
                                AncestorType::ClosestButtonElement},
                               "[contenteditable]",
                               "[contenteditable] button",
                               "[contenteditable] button"},
           AncestorElementTest{
               u"<div contenteditable><b><button><br></button></b></div>",
               "[contenteditable] > b > button",
               {AncestorType::MostDistantInlineElementInBlock,
                AncestorType::ClosestButtonElement},
               "[contenteditable]",
               "[contenteditable] > b",
               "[contenteditable] > b > button"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const content = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(content);
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForAncestor
              ? body->QuerySelector(
                    nsDependentCString(testData.mExpectedSelectorForAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForInclusiveAncestor
              ? body->QuerySelector(
                    nsDependentCString(
                        testData.mExpectedSelectorForInclusiveAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetInclusiveAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetInclusiveAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
  }
}

TEST(HTMLEditUtilsTest, GetAncestorElement_IgnoreHRElement)
{
  using AncestorType = HTMLEditUtils::AncestorType;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           AncestorElementTest{u"<div contenteditable><hr></div>",
                               "[contenteditable] > hr",
                               {AncestorType::ClosestBlockElement,
                                AncestorType::IgnoreHRElement},
                               "[contenteditable]",
                               "[contenteditable]",
                               "[contenteditable]"},
           AncestorElementTest{
               u"<div contenteditable><button><hr></button></div>",
               "[contenteditable] > button > hr",
               {AncestorType::ClosestBlockElement,
                AncestorType::ClosestButtonElement,
                AncestorType::IgnoreHRElement},
               "[contenteditable]",
               "[contenteditable] > button",
               "[contenteditable] > button"},
           AncestorElementTest{u"<div contenteditable><span><hr></span></div>",
                               "[contenteditable] > span > hr",
                               {AncestorType::MostDistantInlineElementInBlock,
                                AncestorType::IgnoreHRElement},
                               "[contenteditable]",
                               "[contenteditable] > span",
                               "[contenteditable] > span"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const content = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(content);
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForAncestor
              ? body->QuerySelector(
                    nsDependentCString(testData.mExpectedSelectorForAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForInclusiveAncestor
              ? body->QuerySelector(
                    nsDependentCString(
                        testData.mExpectedSelectorForInclusiveAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetInclusiveAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetInclusiveAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
  }
}

TEST(HTMLEditUtilsTest, GetAncestorElement_ClosestContainerElement)
{
  using AncestorType = HTMLEditUtils::AncestorType;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           AncestorElementTest{
               u"<div contenteditable><div><span><br></span></div></div>",
               "[contenteditable] > div > span > br",
               {AncestorType::ClosestContainerElement},
               "[contenteditable]",
               "[contenteditable] > div > span",
               "[contenteditable] > div > span"},
           AncestorElementTest{
               u"<div contenteditable><div><span><br></span></div></div>",
               "[contenteditable] > div > span",
               {AncestorType::ClosestContainerElement},
               "[contenteditable]",
               "[contenteditable] > div",
               "[contenteditable] > div > span"},
           AncestorElementTest{
               u"<div contenteditable><div><span><br></span></div></div>",
               "[contenteditable] > div",
               {AncestorType::ClosestContainerElement},
               "[contenteditable]",
               "[contenteditable]",
               "[contenteditable] > div"},
           AncestorElementTest{u"<br contenteditable>",
                               "br[contenteditable]",
                               {AncestorType::ClosestContainerElement},
                               "br[contenteditable]",
                               // Should return nullptr because of scanning
                               // start from the parent of ancestor limiter.
                               nullptr,
                               // <br> is not a container.
                               nullptr},
           AncestorElementTest{
               u"<br contenteditable>",
               "br[contenteditable]",
               {AncestorType::ClosestContainerElement,
                AncestorType::ReturnAncestorLimiterIfNoProperAncestor},
               "br[contenteditable]",
               // Should return nullptr because of scanning start from the
               // parent of ancestor limiter.
               nullptr,
               // <br> is the ancestor limiter.
               "br[contenteditable]"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const content = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(content);
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForAncestor
              ? body->QuerySelector(
                    nsDependentCString(testData.mExpectedSelectorForAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
    {
      const Element* const expectedElement =
          testData.mExpectedSelectorForInclusiveAncestor
              ? body->QuerySelector(
                    nsDependentCString(
                        testData.mExpectedSelectorForInclusiveAncestor),
                    IgnoreErrors())
              : nullptr;
      const Element* const result = HTMLEditUtils::GetInclusiveAncestorElement(
          *body->QuerySelector(nsDependentCString(testData.mContentSelector),
                               IgnoreErrors()),
          testData.mAncestorTypes,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          testData.mAncestorLimiterSelector
              ? body->QuerySelector(
                    nsDependentCString(testData.mAncestorLimiterSelector),
                    IgnoreErrors())
              : nullptr);
      EXPECT_EQ(result, expectedElement)
          << "GetInclusiveAncestorElement: " << testData
          << "(Got: " << ToString(RefPtr{result}) << ")";
    }
  }
}

TEST(HTMLEditUtilsTest, IsContainerNode)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  for (const char16_t* tagName :
       {u"html", u"body", u"div", u"span", u"select", u"option", u"form"}) {
    const RefPtr<nsAtom> tag = NS_Atomize(tagName);
    MOZ_RELEASE_ASSERT(tag);
    const RefPtr<Element> element = doc->CreateHTMLElement(tag);
    MOZ_RELEASE_ASSERT(element);
    EXPECT_EQ(true, HTMLEditUtils::IsContainerNode(*element))
        << "IsContainerNode(<" << NS_ConvertUTF16toUTF8(tagName).get() << ">)";
  }
  for (const char16_t* tagName : {u"img", u"input", u"br", u"wbr"}) {
    const RefPtr<nsAtom> tag = NS_Atomize(tagName);
    MOZ_RELEASE_ASSERT(tag);
    const RefPtr<Element> element = doc->CreateHTMLElement(tag);
    MOZ_RELEASE_ASSERT(element);
    EXPECT_EQ(false, HTMLEditUtils::IsContainerNode(*element))
        << "IsContainerNode(<" << NS_ConvertUTF16toUTF8(tagName).get() << ">)";
  }
  {
    const RefPtr<nsTextNode> text = doc->CreateEmptyTextNode();
    MOZ_RELEASE_ASSERT(text);
    EXPECT_EQ(false, HTMLEditUtils::IsContainerNode(*text))
        << "IsContainerNode(Text)";
  }
  {
    const RefPtr<Comment> comment =
        doc->CreateComment(nsDependentString(u"abc"));
    MOZ_RELEASE_ASSERT(comment);
    EXPECT_EQ(false, HTMLEditUtils::IsContainerNode(*comment))
        << "IsContainerNode(Comment)";
  }
}

struct MOZ_STACK_CLASS IsEmptyNodeTest final {
  const char16_t* mInnerHTML;
  const char* mTargetSelector;
  const HTMLEditUtils::EmptyCheckOptions mOptions;
  const bool mExpectedValue;
  const bool mExpectedSeenBR;

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const IsEmptyNodeTest& aTest) {
    return aStream << "Check \"" << aTest.mTargetSelector
                   << "\" with options=" << ToString(aTest.mOptions).c_str()
                   << " in \"" << NS_ConvertUTF16toUTF8(aTest.mInnerHTML).get()
                   << "\"";
  }
};

TEST(HTMLEditUtilsTest, IsEmptyNode)
{
  using EmptyCheckOption = HTMLEditUtils::EmptyCheckOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           IsEmptyNodeTest{u"<div></div>", "div", {}, true, false},
           IsEmptyNodeTest{u"<div></div>",
                           "div",
                           {EmptyCheckOption::TreatBlockAsVisible},
                           true,
                           false},
           IsEmptyNodeTest{u"<div><br></div>", "div", {}, true, true},
           IsEmptyNodeTest{u"<div><br></div>",
                           "div",
                           {EmptyCheckOption::TreatBlockAsVisible},
                           true,
                           true},
           IsEmptyNodeTest{u"<div><br></div>",
                           "div",
                           {EmptyCheckOption::TreatSingleBRElementAsVisible},
                           false,
                           false},
           IsEmptyNodeTest{u"<div><!--abc--></div>", "div", {}, true, false},
           IsEmptyNodeTest{u"<div><!--abc--></div>",
                           "div",
                           {EmptyCheckOption::TreatCommentAsVisible},
                           false,
                           false},
           IsEmptyNodeTest{u"<ul><li><br></li></ul>", "ul", {}, true, true},
           IsEmptyNodeTest{u"<ul><li><br></li></ul>",
                           "ul",
                           {EmptyCheckOption::TreatListItemAsVisible},
                           false,
                           false},
           IsEmptyNodeTest{
               u"<table><td><br></td></table>", "table", {}, true, true},
           IsEmptyNodeTest{u"<table><td><br></td></table>",
                           "table",
                           {EmptyCheckOption::TreatTableCellAsVisible},
                           false,
                           false},
           IsEmptyNodeTest{u"<div>abc</div>", "div", {}, false, false},
           IsEmptyNodeTest{
               u"<div><span><br></span></div>", "div", {}, true, true},
           IsEmptyNodeTest{
               u"<div><div><br></div></div>", "div", {}, true, true},
           IsEmptyNodeTest{u"<div><div><br></div></div>",
                           "div",
                           {EmptyCheckOption::TreatBlockAsVisible},
                           false,
                           false},
           IsEmptyNodeTest{u"<dl><dt><br></dt></dl>", "dl", {}, true, true},
           IsEmptyNodeTest{u"<dl><dt><br</dt></dl>",
                           "dl",
                           {EmptyCheckOption::TreatListItemAsVisible},
                           false,
                           false},
           IsEmptyNodeTest{u"<dl><dd><br></dd></dl>", "dl", {}, true, true},
           IsEmptyNodeTest{u"<dl><dd><br</dd></dl>",
                           "dl",
                           {EmptyCheckOption::TreatListItemAsVisible},
                           false,
                           false},
           // form controls should be always not empty.
           IsEmptyNodeTest{u"<input>", "input", {}, false, false},
           IsEmptyNodeTest{u"<select></select>", "select", {}, false, false},
           IsEmptyNodeTest{u"<button></button>", "button", {}, false, false},
           IsEmptyNodeTest{
               u"<textarea></textarea>", "textarea", {}, false, false},
           IsEmptyNodeTest{u"<output></output>", "output", {}, false, false},
           IsEmptyNodeTest{
               u"<progress></progress>", "progress", {}, false, false},
           IsEmptyNodeTest{u"<meter></meter>", "meter", {}, false, false},
           // void elements should be always not empty.
           IsEmptyNodeTest{u"<br>", "br", {}, false, false},
           IsEmptyNodeTest{u"<wbr>", "wbr", {}, false, false},
           IsEmptyNodeTest{u"<img>", "img", {}, false, false},
           // white-spaces should not be treated as visible in block
           IsEmptyNodeTest{u"<div> </div>", "div", {}, true, false},
           IsEmptyNodeTest{u"<span> </span>", "span", {}, true, false},
           IsEmptyNodeTest{u"a<span> </span>b", "span", {}, false, false},
           // sublist's list items and table cells should be treated as visible.
           IsEmptyNodeTest{u"<ul><li><ol><li><br></li></ol></li></ul>",
                           "ul",
                           {},
                           false,
                           false},
           IsEmptyNodeTest{u"<ul><li><table><td><br></td></table></li></ul>",
                           "ul",
                           {},
                           false,
                           false},
           IsEmptyNodeTest{
               u"<table><td><table><td><br></td></table></td></table>",
               "table",
               {},
               false,
               false},
           IsEmptyNodeTest{u"<table><td><ul><li><br></li></ul></td></table>",
                           "table",
                           {},
                           false,
                           false},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mTargetSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    bool seenBR = false;
    const bool ret =
        HTMLEditUtils::IsEmptyNode(*target, testData.mOptions, &seenBR);
    EXPECT_EQ(ret, testData.mExpectedValue)
        << "IsEmptyNode(result): " << testData;
    EXPECT_EQ(seenBR, testData.mExpectedSeenBR)
        << "IsEmptyNode(seenBR): " << testData;
  }
}

struct MOZ_STACK_CLASS GetLeafNodeTest final {
  const char16_t* mInnerHTML;
  const char* mContentSelector;
  const HTMLEditUtils::LeafNodeOptions mOptions;
  const char* mExpectedTargetSelector;
  const char* mExpectedTargetContainerSelector = nullptr;
  const uint32_t mExpectedTargetOffset = 0u;

  nsIContent* GetExpectedTarget(nsINode& aNode) const {
    if (mExpectedTargetSelector) {
      return aNode.QuerySelector(nsDependentCString(mExpectedTargetSelector),
                                 IgnoreErrors());
    }
    if (!mExpectedTargetContainerSelector) {
      return nullptr;
    }
    Element* const container = aNode.QuerySelector(
        nsDependentCString(mExpectedTargetContainerSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(container);
    MOZ_RELEASE_ASSERT(!mExpectedTargetOffset ||
                       mExpectedTargetOffset < container->Length());
    return container->GetChildAt_Deprecated(mExpectedTargetOffset);
  }

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const GetLeafNodeTest& aTest) {
    return aStream << "Scan from \"" << aTest.mContentSelector
                   << "\" with options=" << ToString(aTest.mOptions).c_str()
                   << " in \"" << NS_ConvertUTF16toUTF8(aTest.mInnerHTML).get()
                   << "\"";
  }
};

TEST(HTMLEditUtilsTest, GetLastLeafContent)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div></div>", "div", {}, nullptr},
           GetLeafNodeTest{u"<div><br></div>", "div", {}, "div > br"},
           GetLeafNodeTest{u"<div>abc<br></div>", "div", {}, "div > br"},
           GetLeafNodeTest{u"<div>abc</div>", "div", {}, nullptr, "div", 0u},

           GetLeafNodeTest{
               u"<div><div><br></div></div>", "div", {}, "div > div > br"},
           GetLeafNodeTest{u"<div><div><br></div></div>",
                           "div",
                           {LeafNodeOption::TreatChildBlockAsLeafNode},
                           "div > div"},
           GetLeafNodeTest{u"<div><div><br></div><div><br></div></div>",
                           "div",
                           {},
                           "div > div + div > br"},
           GetLeafNodeTest{u"<div><div><br></div><div><br></div></div>",
                           "div",
                           {LeafNodeOption::TreatChildBlockAsLeafNode},
                           "div > div + div"},

           GetLeafNodeTest{u"<div><!--abc--></div>", "div", {}, nullptr},
           GetLeafNodeTest{u"<div><!--abc--></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           0u},
           GetLeafNodeTest{u"<div><br><!--abc--></div>", "div", {}, "div > br"},
           GetLeafNodeTest{u"<div><br><!--abc--></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           1u},
           GetLeafNodeTest{
               u"<div><div><br></div><div><br></div><!--abc--></div>",
               "div",
               {},
               "div > div + div > br"},
           GetLeafNodeTest{
               u"<div><div><br></div><div><br></div><!--abc--></div>",
               "div",
               {LeafNodeOption::TreatCommentAsLeafNode},
               nullptr,
               "div",
               2u},

           GetLeafNodeTest{
               u"<div><span></span></div>", "div", {}, "div > span"},
           GetLeafNodeTest{u"<div><span></span></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           nullptr},
           GetLeafNodeTest{
               u"<div><br><span></span></div>", "div", {}, "div > span"},
           GetLeafNodeTest{u"<div><br><span></span></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           "div > br"},
           GetLeafNodeTest{
               u"<div><div><br></div><div><br></div><span></span></div>",
               "div",
               {},
               "div > span"},
           GetLeafNodeTest{
               u"<div><div><br></div><div><br></div><span></span></div>",
               "div",
               {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
               "div > div + div > br"},

           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {},
                           "div > span"},
           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div > span",
                           0u},
           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           nullptr},
           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers,
                            LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div > span",
                           0u},

           GetLeafNodeTest{u"<div><br><wbr></div>", "div", {}, "div > wbr"},
           GetLeafNodeTest{u"<div><br><wbr></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           "div > wbr"},
           GetLeafNodeTest{u"<div><br><wbr></div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleInlineVoidElements},
                           "div > br"},

           GetLeafNodeTest{
               u"<div><span>abc</span> </div>", "div", {}, nullptr, "div", 1u},
           GetLeafNodeTest{u"<div><span>abc</span> </div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleText},
                           nullptr,
                           "div > span",
                           0u},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetLastLeafContent(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body))
        << "GetLastLeafContent: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

TEST(HTMLEditUtilsTest, GetFirstLeafContent)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div></div>", "div", {}, nullptr},
           GetLeafNodeTest{u"<div><br></div>", "div", {}, "div > br"},
           GetLeafNodeTest{
               u"<div>abc<br></div>", "div", {}, nullptr, "div", 0u},
           GetLeafNodeTest{u"<div>abc</div>", "div", {}, nullptr, "div", 0u},
           GetLeafNodeTest{
               u"<div><div><br></div></div>", "div", {}, "div > div > br"},

           GetLeafNodeTest{u"<div><div><br></div></div>",
                           "div",
                           {LeafNodeOption::TreatChildBlockAsLeafNode},
                           "div > div"},
           GetLeafNodeTest{u"<div><div><br></div><div><br></div></div>",
                           "div",
                           {},
                           "div > div > br"},
           GetLeafNodeTest{u"<div><div><br></div><div><br></div></div>",
                           "div",
                           {LeafNodeOption::TreatChildBlockAsLeafNode},
                           "div > div"},

           GetLeafNodeTest{u"<div><!--abc--></div>", "div", {}, nullptr},
           GetLeafNodeTest{u"<div><!--abc--></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           0u},
           GetLeafNodeTest{u"<div><!--abc--><br></div>", "div", {}, "div > br"},
           GetLeafNodeTest{u"<div><!--abc--><br></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           0u},
           GetLeafNodeTest{
               u"<div><!--abc--><div><br></div><div><br></div></div>",
               "div",
               {},
               "div > div > br"},
           GetLeafNodeTest{
               u"<div><!--abc--><div><br></div><div><br></div></div>",
               "div",
               {LeafNodeOption::TreatCommentAsLeafNode},
               nullptr,
               "div",
               0u},

           GetLeafNodeTest{
               u"<div><span></span></div>", "div", {}, "div > span"},
           GetLeafNodeTest{u"<div><span></span></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           nullptr},
           GetLeafNodeTest{u"<div><span></span><br></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           "div > br"},
           GetLeafNodeTest{
               u"<div><span></span><div><br></div><div><br></div></div>",
               "div",
               {},
               "div > span"},
           GetLeafNodeTest{
               u"<div><span></span><div><br></div><div><br></div></div>",
               "div",
               {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
               "div > div > br"},

           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {},
                           "div > span"},
           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div > span",
                           0u},
           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           nullptr},
           GetLeafNodeTest{u"<div><span><!-- abc --></span></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers,
                            LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div > span",
                           0u},

           GetLeafNodeTest{u"<div><wbr><br></div>", "div", {}, "div > wbr"},
           GetLeafNodeTest{u"<div><wbr><br></div>",
                           "div",
                           {LeafNodeOption::IgnoreAnyEmptyInlineContainers},
                           "div > wbr"},
           GetLeafNodeTest{u"<div><wbr><br></div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleInlineVoidElements},
                           "div > br"},

           GetLeafNodeTest{
               u"<div> <span>abc</span></div>", "div", {}, nullptr, "div", 0u},
           GetLeafNodeTest{u"<div> <span>abc</span></div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleText},
                           nullptr,
                           "div > span",
                           0u},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetFirstLeafContent(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body))
        << "GetFirstLeafContent: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

TEST(HTMLEditUtilsTest, GetNextLeafContentOrNextBlockElement_Content)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div><br></div><p><br></p>", "div", {}, "p"},
           GetLeafNodeTest{
               u"<div><br></div><!--abc--><p><br></p>", "div", {}, "p"},
           GetLeafNodeTest{u"<div><br></div><!--abc--><p><br></p>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "body",
                           1u},
           GetLeafNodeTest{
               u"<div><br></div><span><br></span>", "div", {}, "span > br"},
           GetLeafNodeTest{u"<div><br></div><span><!--abc--><br></span>",
                           "div",
                           {},
                           "span > br"},
           GetLeafNodeTest{u"<div><br></div><span><!--abc--><br></span>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "span",
                           0u},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result =
        HTMLEditUtils::GetNextLeafContentOrNextBlockElement(
            *target, testData.mOptions,
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetNextLeafContentOrNextBlockElement: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

// TODO: Test GetNextLeafContentOrNextBlockElement() which takes EditorDOMPoint

TEST(HTMLEditUtilsTest, GetPreviousLeafContentOrPreviousBlockElement_Content)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<p><br></p><div><br></div>", "div", {}, "p"},
           GetLeafNodeTest{
               u"<p><br></p><!--abc--><div><br></div>", "div", {}, "p"},
           GetLeafNodeTest{u"<p><br></p><!--abc--><div><br></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "body",
                           1u},
           GetLeafNodeTest{
               u"<span><br></span><div><br></div>", "div", {}, "span > br"},
           GetLeafNodeTest{u"<span><br><!--abc--></span><div><br></div>",
                           "div",
                           {},
                           "span > br"},
           GetLeafNodeTest{u"<span><br><!--abc--></span><div><br></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "span",
                           1u},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result =
        HTMLEditUtils::GetPreviousLeafContentOrPreviousBlockElement(
            *target, testData.mOptions,
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetPreviousLeafContentOrPreviousBlockElement: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

// TODO: Test GetPreviousLeafContentOrPreviousBlockElement() which takes
// EditorDOMPoint

TEST(HTMLEditUtilsTest, GetNextLeafContent_Content)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div><br></div><p><br></p>", "div", {}, "p > br"},
           GetLeafNodeTest{
               u"<div><br></div><!--abc--><p><br></p>", "div", {}, "p > br"},
           GetLeafNodeTest{u"<div><br></div><!--abc--><p><br></p>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "body",
                           1u},
           GetLeafNodeTest{
               u"<div><br></div><span><br></span>", "div", {}, "span > br"},
           GetLeafNodeTest{u"<div><br></div><span><!--abc--><br></span>",
                           "div",
                           {},
                           "span > br"},
           GetLeafNodeTest{u"<div><br></div><span><!--abc--><br></span>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "span",
                           0u},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetNextLeafContent(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetNextLeafContent: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

// TODO: Test GetNextLeafContent() which takes EditorDOMPoint

TEST(HTMLEditUtilsTest, GetPreviousLeafContent_Content)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<p><br></p><div><br></div>", "div", {}, "p > br"},
           GetLeafNodeTest{
               u"<p><br></p><!--abc--><div><br></div>", "div", {}, "p > br"},
           GetLeafNodeTest{u"<p><br></p><!--abc--><div><br></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "body",
                           1u},
           GetLeafNodeTest{
               u"<span><br></span><div><br></div>", "div", {}, "span > br"},
           GetLeafNodeTest{u"<span><br><!--abc--></span><div><br></div>",
                           "div",
                           {},
                           "span > br"},
           GetLeafNodeTest{u"<span><br><!--abc--></span><div><br></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "span",
                           1u},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetPreviousLeafContent(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetPreviousLeafContent: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

// TODO: Test GetPreviousLeafContent() which takes EditorDOMPoint

TEST(HTMLEditUtilsTest, GetPreviousSibling)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div><p><br></p></div>", "div > p", {}, nullptr},
           GetLeafNodeTest{u"<div><p><br></p><p><br></p></div>",
                           "div > p + p",
                           {},
                           "div > p"},
           GetLeafNodeTest{u"<div><p><br></p><!-- comment --><p><br></p></div>",
                           "div p + p",
                           {},
                           "div > p"},
           GetLeafNodeTest{u"<div><p><br></p><!-- comment --><p><br></p></div>",
                           "div > p + p",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           1u},
           GetLeafNodeTest{u"<div><p><br></p> <p><br></p></div>",
                           "div > p + p",
                           {},
                           nullptr,
                           "div",
                           1u},
           GetLeafNodeTest{u"<div><p><br></p> <p><br></p></div>",
                           "div > p + p",
                           {LeafNodeOption::IgnoreInvisibleText},
                           "div > p"},
           GetLeafNodeTest{
               u"<div contenteditable><p><br></p><p "
               u"contenteditable=\"false\"><br></p><p><br></p></div>",
               "div > p + p + p",
               {},
               "div > p + p"},
           GetLeafNodeTest{
               u"<div contenteditable><p><br></p><p "
               u"contenteditable=\"false\"><br></p><p><br></p></div>",
               "div > p + p + p",
               {LeafNodeOption::IgnoreNonEditableNode},
               "div > p"},
           GetLeafNodeTest{
               u"<div><b>abc</b><s><!-- comment --></s><i>def</i></div>",
               "div > i",
               {},
               "div > s"},
           GetLeafNodeTest{
               u"<div><b>abc</b><s><!-- comment --></s><i>def</i></div>",
               "div > i",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers},
               "div > b"},
           GetLeafNodeTest{
               u"<div><b>abc</b><s><!-- comment --></s><i>def</i></div>",
               "div > i",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers,
                LeafNodeOption::TreatCommentAsLeafNode},
               "div > s"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetPreviousSibling(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetPreviousSibling: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

TEST(HTMLEditUtilsTest, GetNextSibling)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div><p><br></p></div>", "div > p", {}, nullptr},
           GetLeafNodeTest{u"<div><p><br></p><p><br></p></div>",
                           "div > p",
                           {},
                           "div > p + p"},
           GetLeafNodeTest{u"<div><p><br></p><!-- comment --><p><br></p></div>",
                           "div > p",
                           {},
                           "div > p + p"},
           GetLeafNodeTest{u"<div><p><br></p><!-- comment --><p><br></p></div>",
                           "div > p",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           1u},
           GetLeafNodeTest{u"<div><p><br></p> <p><br></p></div>",
                           "div > p",
                           {},
                           nullptr,
                           "div",
                           1u},
           GetLeafNodeTest{u"<div><p><br></p> <p><br></p></div>",
                           "div > p",
                           {LeafNodeOption::IgnoreInvisibleText},
                           "div > p + p"},
           GetLeafNodeTest{
               u"<div contenteditable><p><br></p><p "
               u"contenteditable=\"false\"><br></p><p><br></p></div>",
               "div p + p",
               {},
               "div > p + p + p"},
           GetLeafNodeTest{
               u"<div contenteditable><p><br></p><p "
               u"contenteditable=\"false\"><br></p><p><br></p></div>",
               "div p",
               {LeafNodeOption::IgnoreNonEditableNode},
               "div > p  + p + p"},
           GetLeafNodeTest{
               u"<div><b>abc</b><s><!-- comment --></s><i>def</i></div>",
               "div > b",
               {},
               "div > s"},
           GetLeafNodeTest{
               u"<div><b>abc</b><s><!-- comment --></s><i>def</i></div>",
               "div > b",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers},
               "div > i"},
           GetLeafNodeTest{
               u"<div><b>abc</b><s><!-- comment --></s><i>def</i></div>",
               "div > b",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers,
                LeafNodeOption::TreatCommentAsLeafNode},
               "div > s"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetNextSibling(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetNextSibling: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

TEST(HTMLEditUtilsTest, GetFirstChild)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div></div>", "div", {}, nullptr},
           GetLeafNodeTest{u"<div><p><br></p></div>", "div", {}, "div > p"},
           GetLeafNodeTest{
               u"<div><!-- comment --><p><br></p></div>", "div", {}, "div > p"},
           GetLeafNodeTest{u"<div><!-- comment --><p><br></p></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           0u},
           GetLeafNodeTest{
               u"<div> <p><br></p></div>", "div", {}, nullptr, "div", 0u},
           GetLeafNodeTest{u"<div> <p><br></p></div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleText},
                           "div > p"},
           GetLeafNodeTest{
               u"<div contenteditable><p "
               u"contenteditable=\"false\"><br></p><p><br></p></div>",
               "div",
               {},
               "div > p"},
           GetLeafNodeTest{
               u"<div contenteditable><p "
               u"contenteditable=\"false\"><br></p><p><br></p></div>",
               "div",
               {LeafNodeOption::IgnoreNonEditableNode},
               "div > p + p"},
           GetLeafNodeTest{u"<div><s><!-- comment --></s><i>def</i></div>",
                           "div",
                           {},
                           "div > s"},
           GetLeafNodeTest{
               u"<div><s><!-- comment --></s><i>def</i></div>",
               "div",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers},
               "div > i"},
           GetLeafNodeTest{
               u"<div><s><!-- comment --></s><i>def</i></div>",
               "div",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers,
                LeafNodeOption::TreatCommentAsLeafNode},
               "div > s"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetFirstChild(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetFirstChild: " << testData << "(Got: " << ToString(RefPtr{result})
        << ")";
  }
}

TEST(HTMLEditUtilsTest, GetLastChild)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div></div>", "div", {}, nullptr},
           GetLeafNodeTest{u"<div><p><br></p></div>", "div", {}, "div > p"},
           GetLeafNodeTest{
               u"<div><p><br></p><!-- comment --></div>", "div", {}, "div > p"},
           GetLeafNodeTest{u"<div><p><br></p><!-- comment --></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           nullptr,
                           "div",
                           1u},
           GetLeafNodeTest{
               u"<div><p><br></p> </div>", "div", {}, nullptr, "div", 1u},
           GetLeafNodeTest{u"<div><p><br></p> </div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleText},
                           "div > p"},
           GetLeafNodeTest{u"<div contenteditable><p><br></p><p "
                           u"contenteditable=\"false\"><br></p></div>",
                           "div",
                           {},
                           "div > p + p"},
           GetLeafNodeTest{u"<div contenteditable><p><br></p><p "
                           u"contenteditable=\"false\"><br></p></div>",
                           "div",
                           {LeafNodeOption::IgnoreNonEditableNode},
                           "div > p"},
           GetLeafNodeTest{u"<div><i>def</i><s><!-- comment --></s></div>",
                           "div",
                           {},
                           "div > s"},
           GetLeafNodeTest{
               u"<div><i>def</i><s><!-- comment --></s></div>",
               "div",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers},
               "div > i"},
           GetLeafNodeTest{
               u"<div><i>def</i><s><!-- comment --></s></div>",
               "div",
               {LeafNodeOption::IgnoreInvisibleEmptyInlineContainers,
                LeafNodeOption::TreatCommentAsLeafNode},
               "div > s"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result = HTMLEditUtils::GetLastChild(
        *target, testData.mOptions,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetLastChild: " << testData << "(Got: " << ToString(RefPtr{result})
        << ")";
  }
}

TEST(HTMLEditUtilsTest, GetInclusiveDeepestFirstChildWhichHasOneChild)
{
  using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           GetLeafNodeTest{u"<div></div>", "div", {}, "div"},
           GetLeafNodeTest{u"<div><br></div>", "div", {}, "div"},
           GetLeafNodeTest{
               u"<div><div><br></div></div>", "div", {}, "div > div"},
           GetLeafNodeTest{
               u"<div><!-- comment --><br></div>", "div", {}, "div"},
           GetLeafNodeTest{u"<div><!-- comment --><br></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           "div"},
           GetLeafNodeTest{u"<div><div><!-- comment --><br></div></div>",
                           "div",
                           {},
                           "div > div"},
           GetLeafNodeTest{u"<div><div><!-- comment --><br></div></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           "div > div"},
           GetLeafNodeTest{u"<div><!-- comment --><div><br></div></div>",
                           "div",
                           {},
                           "div > div"},
           GetLeafNodeTest{u"<div><!-- comment --><div><br></div></div>",
                           "div",
                           {LeafNodeOption::TreatCommentAsLeafNode},
                           "div"},
           GetLeafNodeTest{u"<div> <br></div>", "div", {}, "div"},
           GetLeafNodeTest{u"<div> <br></div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleText},
                           "div"},
           GetLeafNodeTest{
               u"<div><div> <br></div></div>", "div", {}, "div > div"},
           GetLeafNodeTest{u"<div><div> <br></div></div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleText},
                           "div > div"},
           GetLeafNodeTest{u"<div> <div><br></div></div>", "div", {}, "div"},
           GetLeafNodeTest{u"<div> <div><br></div></div>",
                           "div",
                           {LeafNodeOption::IgnoreInvisibleText},
                           "div > div"},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const target = body->QuerySelector(
        nsDependentCString(testData.mContentSelector), IgnoreErrors());
    MOZ_RELEASE_ASSERT(target);
    const nsIContent* result =
        HTMLEditUtils::GetInclusiveDeepestFirstChildWhichHasOneChild(
            *target, testData.mOptions,
            BlockInlineCheck::UseComputedDisplayOutsideStyle, nsGkAtoms::div,
            nsGkAtoms::blockquote, nsGkAtoms::ul, nsGkAtoms::ol, nsGkAtoms::dl);
    EXPECT_EQ(result, testData.GetExpectedTarget(*body->GetParentNode()))
        << "GetInclusiveDeepestFirstChildWhichHasOneChild: " << testData
        << "(Got: " << ToString(RefPtr{result}) << ")";
  }
}

struct MOZ_STACK_CLASS LineBreakBeforeBlockBoundaryTest final {
  const char16_t* const mInnerHTML;
  const char* const mContainer;
  const Maybe<uint32_t>
      mContainerIndex;  // Set if need to use CharacterData in mContainer.
  const uint32_t mOffset;
  const bool mExpectedResult;  // true if the method return a line break

  friend std::ostream& operator<<(
      std::ostream& aStream, const LineBreakBeforeBlockBoundaryTest& aTest) {
    aStream << "Scan from { container: " << aTest.mContainer;
    if (aTest.mContainerIndex) {
      aStream << "'s " << aTest.mContainerIndex.value() + 1 << "th child";
    }
    return aStream << ", offset: " << aTest.mOffset << " } in "
                   << NS_ConvertUTF16toUTF8(aTest.mInnerHTML).get() << "\"";
  }
};

TEST(HTMLEditUtilsTest, GetLineBreakBeforeBlockBoundaryIfPointIsBetweenThem)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsGenericHTMLElement> body = doc->GetBody();
  MOZ_RELEASE_ASSERT(body);
  for (const auto& testData : {
           LineBreakBeforeBlockBoundaryTest{u"<div contenteditable>abc</div>",
                                            "div", Some(0), 3, false},
           LineBreakBeforeBlockBoundaryTest{u"<div contenteditable>abc</div>",
                                            "div", Nothing{}, 1, false},
           LineBreakBeforeBlockBoundaryTest{u"<div contenteditable><br></div>",
                                            "div", Nothing{}, 0, false},
           LineBreakBeforeBlockBoundaryTest{u"<div contenteditable><br></div>",
                                            "div", Nothing{}, 1, true},
           LineBreakBeforeBlockBoundaryTest{
               u"<div contenteditable><br>  </div>", "div", Some(1), 2, true},
           LineBreakBeforeBlockBoundaryTest{
               u"<div contenteditable><br><!-- X --></div>", "div", Nothing{},
               2, true},
           LineBreakBeforeBlockBoundaryTest{
               u"<div contenteditable><br><br></div>", "div", Nothing{}, 1,
               false},
           LineBreakBeforeBlockBoundaryTest{
               u"<div contenteditable><br><p>abc</p></div>", "div", Nothing{},
               1, true},
       }) {
    body->SetInnerHTMLTrusted(nsDependentString(testData.mInnerHTML),
                              doc->NodePrincipal(), IgnoreErrors());
    const Element* const containerElement = body->QuerySelector(
        nsDependentCString(testData.mContainer), IgnoreErrors());
    MOZ_ASSERT(containerElement);
    const Element* const editingHost =
        body->QuerySelector("[contenteditable]"_ns, IgnoreErrors());
    MOZ_ASSERT(editingHost);
    const nsIContent* const container =
        testData.mContainerIndex
            ? containerElement->GetChildAt_Deprecated(*testData.mContainerIndex)
            : containerElement;
    MOZ_RELEASE_ASSERT(container);
    const Maybe<EditorRawLineBreak> result =
        HTMLEditUtils::GetLineBreakBeforeBlockBoundaryIfPointIsBetweenThem<
            EditorRawLineBreak>(EditorRawDOMPoint(container, testData.mOffset),
                                *editingHost);
    EXPECT_EQ(result.isSome(), testData.mExpectedResult)
        << "GetLineBreakBeforeBlockBoundaryIfPointIsBetweenThem: " << testData;
  }
}

}  // namespace mozilla
