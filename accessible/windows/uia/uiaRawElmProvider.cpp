/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "uiaRawElmProvider.h"

#include <comdef.h>
#include <uiautomationcoreapi.h>

#include "AccAttributes.h"
#include "AccessibleWrap.h"
#include "ARIAMap.h"
#include "LocalAccessible-inl.h"
#include "mozilla/a11y/RemoteAccessible.h"
#include "mozilla/StaticPrefs_accessibility.h"
#include "MsaaAccessible.h"
#include "MsaaRootAccessible.h"
#include "nsAccessibilityService.h"
#include "nsAccUtils.h"
#include "nsTextEquivUtils.h"
#include "RootAccessible.h"

using namespace mozilla;
using namespace mozilla::a11y;

// Helper functions

static ToggleState ToToggleState(uint64_t aState) {
  if (aState & states::MIXED) {
    return ToggleState_Indeterminate;
  }
  if (aState & (states::CHECKED | states::PRESSED)) {
    return ToggleState_On;
  }
  return ToggleState_Off;
}

static ExpandCollapseState ToExpandCollapseState(uint64_t aState) {
  if (aState & states::EXPANDED) {
    return ExpandCollapseState_Expanded;
  }
  // If aria-haspopup is specified without aria-expanded, we should still expose
  // collapsed, since aria-haspopup infers that it can be expanded. The
  // alternative is ExpandCollapseState_LeafNode, but that means that the
  // element can't be expanded nor collapsed.
  if (aState & (states::COLLAPSED | states::HASPOPUP)) {
    return ExpandCollapseState_Collapsed;
  }
  return ExpandCollapseState_LeafNode;
}

////////////////////////////////////////////////////////////////////////////////
// uiaRawElmProvider
////////////////////////////////////////////////////////////////////////////////

Accessible* uiaRawElmProvider::Acc() const {
  return static_cast<const MsaaAccessible*>(this)->Acc();
}

/* static */
void uiaRawElmProvider::RaiseUiaEventForGeckoEvent(Accessible* aAcc,
                                                   uint32_t aGeckoEvent) {
  if (!StaticPrefs::accessibility_uia_enable()) {
    return;
  }
  auto* uia = MsaaAccessible::GetFrom(aAcc);
  if (!uia) {
    return;
  }
  PROPERTYID property = 0;
  _variant_t newVal;
  bool gotNewVal = false;
  // For control pattern properties, we can't use GetPropertyValue. In those
  // cases, we must set newVal appropriately and set gotNewVal to true.
  switch (aGeckoEvent) {
    case nsIAccessibleEvent::EVENT_DESCRIPTION_CHANGE:
      property = UIA_FullDescriptionPropertyId;
      break;
    case nsIAccessibleEvent::EVENT_FOCUS:
      ::UiaRaiseAutomationEvent(uia, UIA_AutomationFocusChangedEventId);
      return;
    case nsIAccessibleEvent::EVENT_NAME_CHANGE:
      property = UIA_NamePropertyId;
      break;
    case nsIAccessibleEvent::EVENT_TEXT_VALUE_CHANGE:
      property = UIA_ValueValuePropertyId;
      newVal.vt = VT_BSTR;
      uia->get_Value(&newVal.bstrVal);
      gotNewVal = true;
      break;
  }
  if (property && ::UiaClientsAreListening()) {
    // We can't get the old value. Thankfully, clients don't seem to need it.
    _variant_t oldVal;
    if (!gotNewVal) {
      // This isn't a pattern property, so we can use GetPropertyValue.
      uia->GetPropertyValue(property, &newVal);
    }
    ::UiaRaiseAutomationPropertyChangedEvent(uia, property, oldVal, newVal);
  }
}

/* static */
void uiaRawElmProvider::RaiseUiaEventForStateChange(Accessible* aAcc,
                                                    uint64_t aState,
                                                    bool aEnabled) {
  if (!StaticPrefs::accessibility_uia_enable()) {
    return;
  }
  auto* uia = MsaaAccessible::GetFrom(aAcc);
  if (!uia) {
    return;
  }
  PROPERTYID property = 0;
  _variant_t newVal;
  switch (aState) {
    case states::CHECKED:
    case states::MIXED:
    case states::PRESSED:
      property = UIA_ToggleToggleStatePropertyId;
      newVal.vt = VT_I4;
      newVal.lVal = ToToggleState(aEnabled ? aState : 0);
      break;
    case states::COLLAPSED:
    case states::EXPANDED:
    case states::HASPOPUP:
      property = UIA_ExpandCollapseExpandCollapseStatePropertyId;
      newVal.vt = VT_I4;
      newVal.lVal = ToExpandCollapseState(aEnabled ? aState : 0);
      break;
    case states::UNAVAILABLE:
      property = UIA_IsEnabledPropertyId;
      newVal.vt = VT_BOOL;
      newVal.boolVal = aEnabled ? VARIANT_FALSE : VARIANT_TRUE;
      break;
    default:
      return;
  }
  MOZ_ASSERT(property);
  if (::UiaClientsAreListening()) {
    // We can't get the old value. Thankfully, clients don't seem to need it.
    _variant_t oldVal;
    ::UiaRaiseAutomationPropertyChangedEvent(uia, property, oldVal, newVal);
  }
}

// IUnknown

STDMETHODIMP
uiaRawElmProvider::QueryInterface(REFIID aIid, void** aInterface) {
  *aInterface = nullptr;
  if (aIid == IID_IAccessibleEx) {
    *aInterface = static_cast<IAccessibleEx*>(this);
  } else if (aIid == IID_IRawElementProviderSimple) {
    *aInterface = static_cast<IRawElementProviderSimple*>(this);
  } else if (aIid == IID_IRawElementProviderFragment) {
    *aInterface = static_cast<IRawElementProviderFragment*>(this);
  } else if (aIid == IID_IExpandCollapseProvider) {
    *aInterface = static_cast<IExpandCollapseProvider*>(this);
  } else if (aIid == IID_IInvokeProvider) {
    *aInterface = static_cast<IInvokeProvider*>(this);
  } else if (aIid == IID_IScrollItemProvider) {
    *aInterface = static_cast<IScrollItemProvider*>(this);
  } else if (aIid == IID_IToggleProvider) {
    *aInterface = static_cast<IToggleProvider*>(this);
  } else if (aIid == IID_IValueProvider) {
    *aInterface = static_cast<IValueProvider*>(this);
  } else {
    return E_NOINTERFACE;
  }
  MOZ_ASSERT(*aInterface);
  static_cast<MsaaAccessible*>(this)->AddRef();
  return S_OK;
}

////////////////////////////////////////////////////////////////////////////////
// IAccessibleEx

STDMETHODIMP
uiaRawElmProvider::GetObjectForChild(
    long aIdChild, __RPC__deref_out_opt IAccessibleEx** aAccEx) {
  if (!aAccEx) return E_INVALIDARG;

  *aAccEx = nullptr;

  return Acc() ? S_OK : CO_E_OBJNOTCONNECTED;
}

STDMETHODIMP
uiaRawElmProvider::GetIAccessiblePair(__RPC__deref_out_opt IAccessible** aAcc,
                                      __RPC__out long* aIdChild) {
  if (!aAcc || !aIdChild) return E_INVALIDARG;

  *aAcc = nullptr;
  *aIdChild = 0;

  if (!Acc()) {
    return CO_E_OBJNOTCONNECTED;
  }

  *aIdChild = CHILDID_SELF;
  RefPtr<IAccessible> copy = static_cast<MsaaAccessible*>(this);
  copy.forget(aAcc);

  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::GetRuntimeId(__RPC__deref_out_opt SAFEARRAY** aRuntimeIds) {
  if (!aRuntimeIds) return E_INVALIDARG;
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }

  int ids[] = {UiaAppendRuntimeId, MsaaAccessible::GetChildIDFor(acc)};
  *aRuntimeIds = SafeArrayCreateVector(VT_I4, 0, 2);
  if (!*aRuntimeIds) return E_OUTOFMEMORY;

  for (LONG i = 0; i < (LONG)ArrayLength(ids); i++)
    SafeArrayPutElement(*aRuntimeIds, &i, (void*)&(ids[i]));

  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::ConvertReturnedElement(
    __RPC__in_opt IRawElementProviderSimple* aRawElmProvider,
    __RPC__deref_out_opt IAccessibleEx** aAccEx) {
  if (!aRawElmProvider || !aAccEx) return E_INVALIDARG;

  *aAccEx = nullptr;

  void* instancePtr = nullptr;
  HRESULT hr = aRawElmProvider->QueryInterface(IID_IAccessibleEx, &instancePtr);
  if (SUCCEEDED(hr)) *aAccEx = static_cast<IAccessibleEx*>(instancePtr);

  return hr;
}

////////////////////////////////////////////////////////////////////////////////
// IRawElementProviderSimple

STDMETHODIMP
uiaRawElmProvider::get_ProviderOptions(
    __RPC__out enum ProviderOptions* aOptions) {
  if (!aOptions) return E_INVALIDARG;

  *aOptions = static_cast<enum ProviderOptions>(
      ProviderOptions_ServerSideProvider | ProviderOptions_UseComThreading |
      ProviderOptions_HasNativeIAccessible);
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::GetPatternProvider(
    PATTERNID aPatternId, __RPC__deref_out_opt IUnknown** aPatternProvider) {
  if (!aPatternProvider) return E_INVALIDARG;
  *aPatternProvider = nullptr;
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  switch (aPatternId) {
    case UIA_ExpandCollapsePatternId:
      if (HasExpandCollapsePattern()) {
        RefPtr<IExpandCollapseProvider> expand = this;
        expand.forget(aPatternProvider);
      }
      return S_OK;
    case UIA_InvokePatternId:
      // Per the UIA documentation, we should only expose the Invoke pattern "if
      // the same behavior is not exposed through another control pattern
      // provider".
      if (acc->ActionCount() > 0 && !HasTogglePattern() &&
          !HasExpandCollapsePattern()) {
        RefPtr<IInvokeProvider> invoke = this;
        invoke.forget(aPatternProvider);
      }
      return S_OK;
    case UIA_ScrollItemPatternId: {
      RefPtr<IScrollItemProvider> scroll = this;
      scroll.forget(aPatternProvider);
      return S_OK;
    }
    case UIA_TogglePatternId:
      if (HasTogglePattern()) {
        RefPtr<IToggleProvider> toggle = this;
        toggle.forget(aPatternProvider);
      }
      return S_OK;
    case UIA_ValuePatternId:
      if (HasValuePattern()) {
        RefPtr<IValueProvider> value = this;
        value.forget(aPatternProvider);
      }
      return S_OK;
  }
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::GetPropertyValue(PROPERTYID aPropertyId,
                                    __RPC__out VARIANT* aPropertyValue) {
  if (!aPropertyValue) return E_INVALIDARG;

  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  LocalAccessible* localAcc = acc->AsLocal();

  aPropertyValue->vt = VT_EMPTY;

  switch (aPropertyId) {
    // Accelerator Key / shortcut.
    case UIA_AcceleratorKeyPropertyId: {
      if (!localAcc) {
        // KeyboardShortcut is only currently relevant for LocalAccessible.
        break;
      }
      nsAutoString keyString;

      localAcc->KeyboardShortcut().ToString(keyString);

      if (!keyString.IsEmpty()) {
        aPropertyValue->vt = VT_BSTR;
        aPropertyValue->bstrVal = ::SysAllocString(keyString.get());
        return S_OK;
      }

      break;
    }

    // Access Key / mneumonic.
    case UIA_AccessKeyPropertyId: {
      nsAutoString keyString;

      acc->AccessKey().ToString(keyString);

      if (!keyString.IsEmpty()) {
        aPropertyValue->vt = VT_BSTR;
        aPropertyValue->bstrVal = ::SysAllocString(keyString.get());
        return S_OK;
      }

      break;
    }

    // ARIA Role / shortcut
    case UIA_AriaRolePropertyId: {
      nsAutoString xmlRoles;

      RefPtr<AccAttributes> attributes = acc->Attributes();
      attributes->GetAttribute(nsGkAtoms::xmlroles, xmlRoles);

      if (!xmlRoles.IsEmpty()) {
        aPropertyValue->vt = VT_BSTR;
        aPropertyValue->bstrVal = ::SysAllocString(xmlRoles.get());
        return S_OK;
      }

      break;
    }

    // ARIA Properties
    case UIA_AriaPropertiesPropertyId: {
      if (!localAcc) {
        // XXX Implement a unified version of this. We don't cache explicit
        // values for many ARIA attributes in RemoteAccessible; e.g. we use the
        // checked state rather than caching aria-checked:true. Thus, a unified
        // implementation will need to work with State(), etc.
        break;
      }
      nsAutoString ariaProperties;

      aria::AttrIterator attribIter(localAcc->GetContent());
      while (attribIter.Next()) {
        nsAutoString attribName, attribValue;
        nsAutoString value;
        attribIter.AttrName()->ToString(attribName);
        attribIter.AttrValue(attribValue);
        if (StringBeginsWith(attribName, u"aria-"_ns)) {
          // Found 'aria-'
          attribName.ReplaceLiteral(0, 5, u"");
        }

        ariaProperties.Append(attribName);
        ariaProperties.Append('=');
        ariaProperties.Append(attribValue);
        ariaProperties.Append(';');
      }

      if (!ariaProperties.IsEmpty()) {
        // remove last delimiter:
        ariaProperties.Truncate(ariaProperties.Length() - 1);
        aPropertyValue->vt = VT_BSTR;
        aPropertyValue->bstrVal = ::SysAllocString(ariaProperties.get());
        return S_OK;
      }

      break;
    }

    case UIA_AutomationIdPropertyId: {
      nsAutoString id;
      acc->DOMNodeID(id);
      if (!id.IsEmpty()) {
        aPropertyValue->vt = VT_BSTR;
        aPropertyValue->bstrVal = ::SysAllocString(id.get());
        return S_OK;
      }
      break;
    }

    case UIA_ControlTypePropertyId:
      aPropertyValue->vt = VT_I4;
      aPropertyValue->lVal = GetControlType();
      break;

    case UIA_FullDescriptionPropertyId: {
      nsAutoString desc;
      acc->Description(desc);
      if (!desc.IsEmpty()) {
        aPropertyValue->vt = VT_BSTR;
        aPropertyValue->bstrVal = ::SysAllocString(desc.get());
        return S_OK;
      }
      break;
    }

    case UIA_HasKeyboardFocusPropertyId:
      aPropertyValue->vt = VT_BOOL;
      aPropertyValue->boolVal = VARIANT_FALSE;
      if (auto* focusMgr = FocusMgr()) {
        if (focusMgr->IsFocused(acc)) {
          aPropertyValue->boolVal = VARIANT_TRUE;
        }
      }
      return S_OK;

    case UIA_IsContentElementPropertyId:
    case UIA_IsControlElementPropertyId:
      aPropertyValue->vt = VT_BOOL;
      aPropertyValue->boolVal = IsControl() ? VARIANT_TRUE : VARIANT_FALSE;
      return S_OK;

    case UIA_IsEnabledPropertyId:
      aPropertyValue->vt = VT_BOOL;
      aPropertyValue->boolVal =
          (acc->State() & states::UNAVAILABLE) ? VARIANT_FALSE : VARIANT_TRUE;
      return S_OK;

    case UIA_IsKeyboardFocusablePropertyId:
      aPropertyValue->vt = VT_BOOL;
      aPropertyValue->boolVal =
          (acc->State() & states::FOCUSABLE) ? VARIANT_TRUE : VARIANT_FALSE;
      return S_OK;

    case UIA_NamePropertyId: {
      nsAutoString name;
      acc->Name(name);
      if (!name.IsEmpty()) {
        aPropertyValue->vt = VT_BSTR;
        aPropertyValue->bstrVal = ::SysAllocString(name.get());
        return S_OK;
      }
      break;
    }
  }

  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::get_HostRawElementProvider(
    __RPC__deref_out_opt IRawElementProviderSimple** aRawElmProvider) {
  if (!aRawElmProvider) return E_INVALIDARG;
  *aRawElmProvider = nullptr;
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  if (acc->IsRoot()) {
    HWND hwnd = MsaaAccessible::GetHWNDFor(acc);
    return UiaHostProviderFromHwnd(hwnd, aRawElmProvider);
  }
  return S_OK;
}

// IRawElementProviderFragment

STDMETHODIMP
uiaRawElmProvider::Navigate(
    enum NavigateDirection aDirection,
    __RPC__deref_out_opt IRawElementProviderFragment** aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  *aRetVal = nullptr;
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  Accessible* target = nullptr;
  switch (aDirection) {
    case NavigateDirection_Parent:
      if (!acc->IsRoot()) {
        target = acc->Parent();
      }
      break;
    case NavigateDirection_NextSibling:
      if (!acc->IsRoot()) {
        target = acc->NextSibling();
      }
      break;
    case NavigateDirection_PreviousSibling:
      if (!acc->IsRoot()) {
        target = acc->PrevSibling();
      }
      break;
    case NavigateDirection_FirstChild:
      if (!nsAccUtils::MustPrune(acc)) {
        target = acc->FirstChild();
      }
      break;
    case NavigateDirection_LastChild:
      if (!nsAccUtils::MustPrune(acc)) {
        target = acc->LastChild();
      }
      break;
    default:
      return E_INVALIDARG;
  }
  RefPtr<IRawElementProviderFragment> fragment =
      MsaaAccessible::GetFrom(target);
  fragment.forget(aRetVal);
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::get_BoundingRectangle(__RPC__out struct UiaRect* aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  LayoutDeviceIntRect rect = acc->Bounds();
  aRetVal->left = rect.X();
  aRetVal->top = rect.Y();
  aRetVal->width = rect.Width();
  aRetVal->height = rect.Height();
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::GetEmbeddedFragmentRoots(
    __RPC__deref_out_opt SAFEARRAY** aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  *aRetVal = nullptr;
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::SetFocus() {
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  acc->TakeFocus();
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::get_FragmentRoot(
    __RPC__deref_out_opt IRawElementProviderFragmentRoot** aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  *aRetVal = nullptr;
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  LocalAccessible* localAcc = acc->AsLocal();
  if (!localAcc) {
    localAcc = acc->AsRemote()->OuterDocOfRemoteBrowser();
    if (!localAcc) {
      return CO_E_OBJNOTCONNECTED;
    }
  }
  MsaaAccessible* msaa = MsaaAccessible::GetFrom(localAcc->RootAccessible());
  RefPtr<IRawElementProviderFragmentRoot> fragRoot =
      static_cast<MsaaRootAccessible*>(msaa);
  fragRoot.forget(aRetVal);
  return S_OK;
}

// IInvokeProvider methods

STDMETHODIMP
uiaRawElmProvider::Invoke() {
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  if (acc->DoAction(0)) {
    // We don't currently have a way to notify when the action was actually
    // handled. The UIA documentation says it's okay to fire this immediately if
    // it "is not possible or practical to wait until the action is complete".
    ::UiaRaiseAutomationEvent(this, UIA_Invoke_InvokedEventId);
  }
  return S_OK;
}

// IToggleProvider methods

STDMETHODIMP
uiaRawElmProvider::Toggle() {
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  acc->DoAction(0);
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::get_ToggleState(__RPC__out enum ToggleState* aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  *aRetVal = ToToggleState(acc->State());
  return S_OK;
}

// IExpandCollapseProvider methods

STDMETHODIMP
uiaRawElmProvider::Expand() {
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  if (acc->State() & states::EXPANDED) {
    return UIA_E_INVALIDOPERATION;
  }
  acc->DoAction(0);
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::Collapse() {
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  if (acc->State() & states::COLLAPSED) {
    return UIA_E_INVALIDOPERATION;
  }
  acc->DoAction(0);
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::get_ExpandCollapseState(
    __RPC__out enum ExpandCollapseState* aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  *aRetVal = ToExpandCollapseState(acc->State());
  return S_OK;
}

// IScrollItemProvider methods

MOZ_CAN_RUN_SCRIPT_BOUNDARY STDMETHODIMP uiaRawElmProvider::ScrollIntoView() {
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  acc->ScrollTo(nsIAccessibleScrollType::SCROLL_TYPE_ANYWHERE);
  return S_OK;
}

// IValueProvider methods

STDMETHODIMP
uiaRawElmProvider::SetValue(__RPC__in LPCWSTR aVal) {
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  HyperTextAccessibleBase* ht = acc->AsHyperTextBase();
  if (!ht || !acc->IsTextRole()) {
    return UIA_E_INVALIDOPERATION;
  }
  if (acc->State() & (states::READONLY | states::UNAVAILABLE)) {
    return UIA_E_INVALIDOPERATION;
  }
  nsAutoString text(aVal);
  ht->ReplaceText(text);
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::get_Value(__RPC__deref_out_opt BSTR* aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  *aRetVal = nullptr;
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  nsAutoString value;
  acc->Value(value);
  *aRetVal = ::SysAllocStringLen(value.get(), value.Length());
  if (!*aRetVal) {
    return E_OUTOFMEMORY;
  }
  return S_OK;
}

STDMETHODIMP
uiaRawElmProvider::get_IsReadOnly(__RPC__out BOOL* aRetVal) {
  if (!aRetVal) {
    return E_INVALIDARG;
  }
  Accessible* acc = Acc();
  if (!acc) {
    return CO_E_OBJNOTCONNECTED;
  }
  *aRetVal = acc->State() & states::READONLY;
  return S_OK;
}

// Private methods

bool uiaRawElmProvider::IsControl() {
  // UIA provides multiple views of the tree: raw, control and content. The
  // control and content views should only contain elements which a user cares
  // about when navigating.
  Accessible* acc = Acc();
  MOZ_ASSERT(acc);
  if (acc->IsTextLeaf()) {
    // If an ancestor control allows the name to be generated from content, do
    // not expose this text leaf as a control. Otherwise, the user will see the
    // text twice: once as the label of the control and once for the text leaf.
    for (Accessible* ancestor = acc->Parent(); ancestor && !ancestor->IsDoc();
         ancestor = ancestor->Parent()) {
      if (nsTextEquivUtils::HasNameRule(ancestor, eNameFromSubtreeRule)) {
        return false;
      }
    }
    return true;
  }

  if (acc->HasNumericValue() || acc->ActionCount() > 0) {
    return true;
  }
  uint64_t state = acc->State();
  if (state & states::FOCUSABLE) {
    return true;
  }
  if (state & states::EDITABLE) {
    Accessible* parent = acc->Parent();
    if (parent && !(parent->State() & states::EDITABLE)) {
      // This is the root of a rich editable control.
      return true;
    }
  }

  // Don't treat generic or text containers as controls unless they have a name
  // or description.
  switch (acc->Role()) {
    case roles::EMPHASIS:
    case roles::MARK:
    case roles::PARAGRAPH:
    case roles::SECTION:
    case roles::STRONG:
    case roles::SUBSCRIPT:
    case roles::SUPERSCRIPT:
    case roles::TEXT:
    case roles::TEXT_CONTAINER: {
      if (!acc->NameIsEmpty()) {
        return true;
      }
      nsAutoString text;
      acc->Description(text);
      if (!text.IsEmpty()) {
        return true;
      }
      return false;
    }
    default:
      break;
  }

  return true;
}

long uiaRawElmProvider::GetControlType() const {
  Accessible* acc = Acc();
  MOZ_ASSERT(acc);
#define ROLE(_geckoRole, stringRole, ariaRole, atkRole, macRole, macSubrole, \
             msaaRole, ia2Role, androidClass, iosIsElement, uiaControlType,  \
             nameRule)                                                       \
  case roles::_geckoRole:                                                    \
    return uiaControlType;                                                   \
    break;
  switch (acc->Role()) {
#include "RoleMap.h"
  }
#undef ROLE
  MOZ_CRASH("Unknown role.");
  return 0;
}

bool uiaRawElmProvider::HasTogglePattern() {
  Accessible* acc = Acc();
  MOZ_ASSERT(acc);
  return acc->State() & states::CHECKABLE ||
         acc->Role() == roles::TOGGLE_BUTTON;
}

bool uiaRawElmProvider::HasExpandCollapsePattern() {
  Accessible* acc = Acc();
  MOZ_ASSERT(acc);
  return acc->State() & (states::EXPANDABLE | states::HASPOPUP);
}

bool uiaRawElmProvider::HasValuePattern() const {
  Accessible* acc = Acc();
  MOZ_ASSERT(acc);
  if (acc->HasNumericValue() || acc->IsCombobox() || acc->IsHTMLLink() ||
      acc->IsTextField()) {
    return true;
  }
  const nsRoleMapEntry* roleMapEntry = acc->ARIARoleMap();
  return roleMapEntry && roleMapEntry->Is(nsGkAtoms::textbox);
}
