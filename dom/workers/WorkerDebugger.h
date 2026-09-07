/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_workers_WorkerDebugger_h
#define mozilla_dom_workers_WorkerDebugger_h

#include "mozilla/dom/WorkerScope.h"
#include "nsCOMPtr.h"
#include "nsIWorkerDebugger.h"
#include "nsProxyRelease.h"

class mozIDOMWindow;
class nsIPrincipal;
class nsPIDOMWindowInner;

namespace mozilla::dom {

class WorkerPrivate;

class WorkerDebugger : public nsIWorkerDebugger {
  class ReportDebuggerErrorRunnable;
  class PostDebuggerMessageRunnable;

  CheckedUnsafePtr<WorkerPrivate> mWorkerPrivate;
  bool mIsInitialized;
  nsTArray<nsCOMPtr<nsIWorkerDebuggerListener>> mListeners;
  nsMainThreadPtrHandle<WorkerDebugger> mSelfHandle;

 public:
  static already_AddRefed<WorkerDebugger> Create(WorkerPrivate* aWorkerPrivate);

  NS_DECL_ISUPPORTS
  NS_DECL_NSIWORKERDEBUGGER

  void AssertIsOnParentThread();

  void Close();

  void PostMessageToDebugger(const nsAString& aMessage);

  void ReportErrorToDebugger(const nsACString& aFilename, uint32_t aLineno,
                             const nsAString& aMessage);

 private:
  explicit WorkerDebugger(WorkerPrivate* aWorkerPrivate);
  virtual ~WorkerDebugger();

  void PostMessageToDebuggerOnMainThread(const nsAString& aMessage);

  void ReportErrorToDebuggerOnMainThread(const nsACString& aFilename,
                                         uint32_t aLineno,
                                         const nsAString& aMessage);

  nsCOMPtr<nsPIDOMWindowInner> DedicatedWorkerWindow();
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_workers_WorkerDebugger_h
