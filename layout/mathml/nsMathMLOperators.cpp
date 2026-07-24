/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsMathMLOperators.h"

#include "mozilla/StaticPrefs_mathml.h"
#include "mozilla/intl/UnicodeProperties.h"
#include "nsCOMPtr.h"
#include "nsCRT.h"
#include "nsHashKeys.h"
#include "nsIPersistentProperties2.h"
#include "nsISimpleEnumerator.h"
#include "nsNetUtil.h"
#include "nsTArray.h"
#include "nsTHashMap.h"

using namespace mozilla;

// operator dictionary entry
struct OperatorData {
  OperatorData(void) : mLeadingSpace(0.0f), mTrailingSpace(0.0f) {}

  // member data
  nsString mStr;
  nsOperatorFlags mFlags;
  float mLeadingSpace;   // unit is em
  float mTrailingSpace;  // unit is em
};

static int32_t gTableRefCount = 0;
static uint32_t gOperatorCount = 0;
static OperatorData* gOperatorArray = nullptr;
static nsTHashMap<nsStringHashKey, OperatorData*>* gOperatorTable = nullptr;
static bool gGlobalsInitialized = false;

static const char16_t kDashCh = char16_t('#');
static const char16_t kColonCh = char16_t(':');

static uint32_t ToUnicodeCodePoint(const nsString& aOperator) {
  if (aOperator.Length() == 1) {
    return aOperator[0];
  }
  if (aOperator.Length() == 2 &&
      NS_IS_SURROGATE_PAIR(aOperator[0], aOperator[1])) {
    return SURROGATE_TO_UCS4(aOperator[0], aOperator[1]);
  }
  return 0;
}

static void SetBooleanProperty(OperatorData* aOperatorData, nsString aName) {
  if (aName.IsEmpty()) {
    return;
  }

  if (aName.EqualsLiteral("stretchy") && (1 == aOperatorData->mStr.Length())) {
    aOperatorData->mFlags.Booleans() += OperatorBoolean::Stretchy;
  } else if (aName.EqualsLiteral("fence")) {
    aOperatorData->mFlags.Booleans() += OperatorBoolean::Fence;
  } else if (!StaticPrefs::mathml_operator_dictionary_accent_disabled() &&
             aName.EqualsLiteral("accent")) {
    aOperatorData->mFlags.Booleans() += OperatorBoolean::Accent;
  } else if (aName.EqualsLiteral("largeop")) {
    aOperatorData->mFlags.Booleans() += OperatorBoolean::LargeOperator;
  } else if (aName.EqualsLiteral("separator")) {
    aOperatorData->mFlags.Booleans() += OperatorBoolean::Separator;
  } else if (aName.EqualsLiteral("movablelimits")) {
    aOperatorData->mFlags.Booleans() += OperatorBoolean::MovableLimits;
  } else if (aName.EqualsLiteral("symmetric")) {
    aOperatorData->mFlags.Booleans() += OperatorBoolean::Symmetric;
  }
}

static void SetProperty(OperatorData* aOperatorData, nsString aName,
                        nsString aValue) {
  if (aName.IsEmpty() || aValue.IsEmpty()) {
    return;
  }

  if (aName.EqualsLiteral("direction")) {
    if (aValue.EqualsLiteral("vertical")) {
      aOperatorData->mFlags.SetDirection(OperatorDirection::Vertical);
    } else if (aValue.EqualsLiteral("horizontal")) {
      aOperatorData->mFlags.SetDirection(OperatorDirection::Horizontal);
    } else {
      return;  // invalid value
    }
  } else {
    bool isLeadingSpace;
    if (aName.EqualsLiteral("lspace")) {
      isLeadingSpace = true;
    } else if (aName.EqualsLiteral("rspace")) {
      isLeadingSpace = false;
    } else {
      return;  // input is not applicable
    }

    // aValue is assumed to be a digit from 0 to 7
    nsresult error = NS_OK;
    float space = aValue.ToFloat(&error) / 18.0;
    if (NS_FAILED(error)) {
      return;
    }

    if (isLeadingSpace) {
      aOperatorData->mLeadingSpace = space;
    } else {
      aOperatorData->mTrailingSpace = space;
    }
  }
}

static bool SetOperator(OperatorData* aOperatorData, OperatorForm aForm,
                        const nsCString& aOperator, nsString& aAttributes)

{
  static const char16_t kNullCh = char16_t('\0');

  // aOperator is in the expanded format \uNNNN\uNNNN ...
  // First compress these Unicode points to the internal nsString format
  int32_t i = 0;
  nsAutoString name, value;
  int32_t len = aOperator.Length();
  char16_t c = aOperator[i++];
  uint32_t state = 0;
  char16_t uchar = 0;
  while (i <= len) {
    if (0 == state) {
      if (c != '\\') {
        return false;
      }
      if (i < len) {
        c = aOperator[i];
      }
      i++;
      if (('u' != c) && ('U' != c)) {
        return false;
      }
      if (i < len) {
        c = aOperator[i];
      }
      i++;
      state++;
    } else {
      if (('0' <= c) && (c <= '9')) {
        uchar = (uchar << 4) | (c - '0');
      } else if (('a' <= c) && (c <= 'f')) {
        uchar = (uchar << 4) | (c - 'a' + 0x0a);
      } else if (('A' <= c) && (c <= 'F')) {
        uchar = (uchar << 4) | (c - 'A' + 0x0a);
      } else {
        return false;
      }
      if (i < len) {
        c = aOperator[i];
      }
      i++;
      state++;
      if (5 == state) {
        value.Append(uchar);
        uchar = 0;
        state = 0;
      }
    }
  }
  if (0 != state) {
    return false;
  }

  // Quick return when the caller doesn't care about the attributes and just
  // wants to know if this is a valid operator (this is the case at the first
  // pass of the parsing of the dictionary in InitOperators())
  if (aForm == OperatorForm::Unknown) {
    return true;
  }

  // Add operator to hash table
  aOperatorData->mFlags.SetForm(aForm);
  aOperatorData->mStr.Assign(value);
  value.AppendInt(static_cast<uint32_t>(aForm), 10);
  gOperatorTable->InsertOrUpdate(value, aOperatorData);

#ifdef DEBUG
  NS_LossyConvertUTF16toASCII str(aAttributes);
#endif
  // Loop over the space-delimited list of attributes to get the name:value
  // pairs
  aAttributes.Append(kNullCh);  // put an extra null at the end
  char16_t* start = aAttributes.BeginWriting();
  char16_t* end = start;
  while ((kNullCh != *start) && (kDashCh != *start)) {
    name.SetLength(0);
    value.SetLength(0);
    // skip leading space, the dash amounts to the end of the line
    while ((kNullCh != *start) && (kDashCh != *start) &&
           nsCRT::IsAsciiSpace(*start)) {
      ++start;
    }
    end = start;
    // look for ':'
    while ((kNullCh != *end) && (kDashCh != *end) &&
           !nsCRT::IsAsciiSpace(*end) && (kColonCh != *end)) {
      ++end;
    }
    // If ':' is not found, then it's a boolean property
    bool IsBooleanProperty = (kColonCh != *end);
    *end = kNullCh;  // end segment here
    // this segment is the name
    if (start < end) {
      name.Assign(start);
    }
    if (IsBooleanProperty) {
      SetBooleanProperty(aOperatorData, name);
    } else {
      start = ++end;
      // look for space or end of line
      while ((kNullCh != *end) && (kDashCh != *end) &&
             !nsCRT::IsAsciiSpace(*end)) {
        ++end;
      }
      *end = kNullCh;  // end segment here
      if (start < end) {
        // this segment is the value
        value.Assign(start);
      }
      SetProperty(aOperatorData, name, value);
    }
    start = ++end;
  }
  return true;
}

static nsresult InitOperators(void) {
  // Load the property file containing the Operator Dictionary
  nsresult rv;
  nsCOMPtr<nsIPersistentProperties> mathfontProp;
  rv = NS_LoadPersistentPropertiesFromURISpec(
      getter_AddRefs(mathfontProp),
      "resource://gre/res/fonts/mathfont.properties"_ns);

  if (NS_FAILED(rv)) {
    return rv;
  }

  // Parse the Operator Dictionary in two passes.
  // The first pass is to count the number of operators; the second pass is to
  // allocate the necessary space for them and to add them in the hash table.
  for (int32_t pass = 1; pass <= 2; pass++) {
    OperatorData dummyData;
    OperatorData* operatorData = &dummyData;
    nsCOMPtr<nsISimpleEnumerator> iterator;
    if (NS_SUCCEEDED(mathfontProp->Enumerate(getter_AddRefs(iterator)))) {
      bool more;
      uint32_t index = 0;
      nsAutoCString name;
      nsAutoString attributes;
      while ((NS_SUCCEEDED(iterator->HasMoreElements(&more))) && more) {
        nsCOMPtr<nsISupports> supports;
        nsCOMPtr<nsIPropertyElement> element;
        if (NS_SUCCEEDED(iterator->GetNext(getter_AddRefs(supports)))) {
          element = do_QueryInterface(supports);
          if (NS_SUCCEEDED(element->GetKey(name)) &&
              NS_SUCCEEDED(element->GetValue(attributes))) {
            // expected key: operator.\uNNNN.{infix,postfix,prefix}
            if ((21 <= name.Length()) && (0 == name.Find("operator.\\u"))) {
              name.Cut(0, 9);  // 9 is the length of "operator.";
              int32_t len = name.Length();
              OperatorForm form;
              if (kNotFound != name.RFind(".infix")) {
                form = OperatorForm::Infix;
                len -= 6;  // 6 is the length of ".infix";
              } else if (kNotFound != name.RFind(".postfix")) {
                form = OperatorForm::Postfix;
                len -= 8;  // 8 is the length of ".postfix";
              } else if (kNotFound != name.RFind(".prefix")) {
                form = OperatorForm::Prefix;
                len -= 7;  // 7 is the length of ".prefix";
              } else {
                continue;  // input is not applicable
              }
              name.SetLength(len);
              if (2 == pass) {  // allocate space and start the storage
                if (!gOperatorArray) {
                  if (0 == gOperatorCount) {
                    return NS_ERROR_UNEXPECTED;
                  }
                  gOperatorArray = new OperatorData[gOperatorCount];
                }
                operatorData = &gOperatorArray[index];
              } else {
                form = OperatorForm::Unknown;  // to quickly return from
                                               // SetOperator() at pass 1
              }
              // See if the operator should be retained
              if (SetOperator(operatorData, form, name, attributes)) {
                index++;
                if (1 == pass) {
                  gOperatorCount = index;
                }
              }
            }
          }
        }
      }
    }
  }
  return NS_OK;
}

static nsresult InitOperatorGlobals() {
  gGlobalsInitialized = true;
  nsresult rv = NS_ERROR_OUT_OF_MEMORY;
  gOperatorTable = new nsTHashMap<nsStringHashKey, OperatorData*>();
  if (gOperatorTable) {
    rv = InitOperators();
  }
  if (NS_FAILED(rv)) {
    nsMathMLOperators::CleanUp();
  }
  return rv;
}

void nsMathMLOperators::CleanUp() {
  if (gOperatorArray) {
    delete[] gOperatorArray;
    gOperatorArray = nullptr;
  }
  if (gOperatorTable) {
    delete gOperatorTable;
    gOperatorTable = nullptr;
  }
}

void nsMathMLOperators::AddRefTable(void) { gTableRefCount++; }

void nsMathMLOperators::ReleaseTable(void) {
  if (0 == --gTableRefCount) {
    CleanUp();
  }
}

static OperatorData* GetOperatorData(const nsString& aOperator,
                                     const OperatorForm aForm) {
  nsAutoString key(aOperator);
  key.AppendInt(static_cast<uint32_t>(aForm));
  return gOperatorTable->Get(key);
}

bool nsMathMLOperators::LookupOperator(const nsString& aOperator,
                                       OperatorForm aForm,
                                       nsOperatorFlags* aFlags,
                                       float* aLeadingSpace,
                                       float* aTrailingSpace) {
  NS_ASSERTION(aFlags && aLeadingSpace && aTrailingSpace, "bad usage");
  NS_ASSERTION(aForm != OperatorForm::Unknown, "*** invalid call ***");

  // Operator strings must be of length 1 or 2 in UTF-16.
  // https://w3c.github.io/mathml-core/#dfn-algorithm-to-determine-the-category-of-an-operator
  if (aOperator.IsEmpty() || aOperator.Length() > 2) {
    return false;
  }

  if (aOperator.Length() == 2) {
    // Try and handle Arabic operators.
    // https://w3c.github.io/mathml-core/#dfn-algorithm-to-determine-the-category-of-an-operator
    if (auto codePoint = ToUnicodeCodePoint(aOperator)) {
      if (aForm == OperatorForm::Postfix &&
          (codePoint == 0x1EEF0 || codePoint == 0x1EEF1)) {
        // Use category I.
        // https://w3c.github.io/mathml-core/#operator-dictionary-categories-values
        aFlags->SetForm(OperatorForm::Postfix);
        aFlags->Booleans() = OperatorBoolean::Stretchy;
        aFlags->SetDirection(OperatorDirection::Horizontal);
        *aLeadingSpace = 0;
        *aTrailingSpace = 0;
        return true;
      }
      return false;
    }

    // Ignore the combining "negation" suffix for 2-character strings.
    // https://w3c.github.io/mathml-core/#dfn-algorithm-to-determine-the-category-of-an-operator
    if (aOperator[1] == 0x0338 || aOperator[1] == 0x20D2) {
      nsAutoString newOperator;
      newOperator.Append(aOperator[0]);
      return LookupOperator(newOperator, aForm, aFlags, aLeadingSpace,
                            aTrailingSpace);
    }
  }

  if (!gGlobalsInitialized) {
    InitOperatorGlobals();
  }
  if (gOperatorTable) {
    if (OperatorData* data = GetOperatorData(aOperator, aForm)) {
      NS_ASSERTION(data->mStr.Equals(aOperator), "bad setup");
      *aFlags = data->mFlags;
      *aLeadingSpace = data->mLeadingSpace;
      *aTrailingSpace = data->mTrailingSpace;
      return true;
    }
  }

  return false;
}

bool nsMathMLOperators::LookupOperatorWithFallback(const nsString& aOperator,
                                                   OperatorForm aForm,
                                                   nsOperatorFlags* aFlags,
                                                   float* aLeadingSpace,
                                                   float* aTrailingSpace) {
  if (LookupOperator(aOperator, aForm, aFlags, aLeadingSpace, aTrailingSpace)) {
    return true;
  }
  for (const auto& form :
       {OperatorForm::Infix, OperatorForm::Postfix, OperatorForm::Prefix}) {
    if (form == aForm) {
      // This form was tried above, skip it.
      continue;
    }
    if (LookupOperator(aOperator, form, aFlags, aLeadingSpace,
                       aTrailingSpace)) {
      return true;
    }
  }
  return false;
}

/* static */
bool nsMathMLOperators::IsMirrorableOperator(const nsString& aOperator) {
  if (auto codePoint = ToUnicodeCodePoint(aOperator)) {
    return intl::UnicodeProperties::IsMirrored(codePoint);
  }
  return false;
}

/* static */
nsString nsMathMLOperators::GetMirroredOperator(const nsString& aOperator) {
  nsString result;
  if (auto codePoint = ToUnicodeCodePoint(aOperator)) {
    result.Assign(intl::UnicodeProperties::CharMirror(codePoint));
  }
  return result;
}

/* static */
bool nsMathMLOperators::IsIntegralOperator(const nsString& aOperator) {
  if (auto codePoint = ToUnicodeCodePoint(aOperator)) {
    return (0x222B <= codePoint && codePoint <= 0x2233) ||
           (0x2A0B <= codePoint && codePoint <= 0x2A1C);
  }
  return false;
}

/* static */
StretchDirection nsMathMLOperators::GetStretchyDirection(
    const nsString& aOperator) {
  // Search any entry for that operator and return the corresponding direction.
  // It is assumed that all the forms have same direction.
  for (const auto& form :
       {OperatorForm::Infix, OperatorForm::Postfix, OperatorForm::Prefix}) {
    nsOperatorFlags flags;
    float dummy;
    if (nsMathMLOperators::LookupOperator(aOperator, form, &flags, &dummy,
                                          &dummy)) {
      if (flags.Direction() == OperatorDirection::Vertical) {
        return StretchDirection::Vertical;
      }
      if (flags.Direction() == OperatorDirection::Horizontal) {
        return StretchDirection::Horizontal;
      }
    }
  }
  return StretchDirection::Unsupported;
}
