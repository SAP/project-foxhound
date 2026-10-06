/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsHtml5Module.h"
#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_html5.h"
#include "nsCOMPtr.h"
#include "nsHtml5AttributeName.h"
#include "nsHtml5ElementName.h"
#include "nsHtml5HtmlAttributes.h"
#include "nsHtml5NamedCharacters.h"
#include "nsHtml5Portability.h"
#include "nsHtml5StackNode.h"
#include "nsHtml5Tokenizer.h"
#include "nsHtml5TreeBuilder.h"
#include "nsHtml5TreeOpExecutor.h"
#include "nsHtml5UTF16Buffer.h"

using namespace mozilla;

// static
nsIThread* nsHtml5Module::sStreamParserThread = nullptr;

// static
void nsHtml5Module::InitializeStatics() {
  nsHtml5AttributeName::initializeStatics();
  nsHtml5ElementName::initializeStatics();
  nsHtml5HtmlAttributes::initializeStatics();
  nsHtml5NamedCharacters::initializeStatics();
  nsHtml5Portability::initializeStatics();
  nsHtml5StackNode::initializeStatics();
  nsHtml5Tokenizer::initializeStatics();
  nsHtml5TreeBuilder::initializeStatics();
  nsHtml5UTF16Buffer::initializeStatics();
  nsHtml5TreeOpExecutor::InitializeStatics();

  NS_NewNamedThread("HTML5 Parser", &sStreamParserThread);
  MOZ_ASSERT(sStreamParserThread,
             "How come we failed to create the parser thread?");

#ifdef DEBUG
  sNsHtml5ModuleInitialized = true;
#endif
}

// static
void nsHtml5Module::ReleaseStatics() {
#ifdef DEBUG
  sNsHtml5ModuleInitialized = false;
#endif
  nsHtml5AttributeName::releaseStatics();
  nsHtml5ElementName::releaseStatics();
  nsHtml5HtmlAttributes::releaseStatics();
  nsHtml5NamedCharacters::releaseStatics();
  nsHtml5Portability::releaseStatics();
  nsHtml5StackNode::releaseStatics();
  nsHtml5Tokenizer::releaseStatics();
  nsHtml5TreeBuilder::releaseStatics();
  nsHtml5UTF16Buffer::releaseStatics();
  NS_IF_RELEASE(sStreamParserThread);
}

// static
already_AddRefed<nsHtml5Parser> nsHtml5Module::NewHtml5Parser() {
  MOZ_ASSERT(sNsHtml5ModuleInitialized, "nsHtml5Module not initialized.");
  RefPtr<nsHtml5Parser> rv = new nsHtml5Parser();
  return rv.forget();
}

// static
already_AddRefed<nsISerialEventTarget>
nsHtml5Module::GetStreamParserEventTarget() {
  MOZ_ASSERT(sNsHtml5ModuleInitialized, "nsHtml5Module not initialized.");
  if (sStreamParserThread) {
    nsCOMPtr<nsISerialEventTarget> target = sStreamParserThread;
    return target.forget();
  }
  nsCOMPtr<nsIThread> mainThread;
  NS_GetMainThread(getter_AddRefs(mainThread));
  MOZ_RELEASE_ASSERT(mainThread);  // Unrecoverable situation
  nsCOMPtr<nsISerialEventTarget> target = mainThread;
  return target.forget();
}

#ifdef DEBUG
bool nsHtml5Module::sNsHtml5ModuleInitialized = false;
#endif
