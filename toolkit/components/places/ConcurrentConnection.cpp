/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ConcurrentConnection.h"

#include "Database.h"
#include "Helpers.h"
#include "SQLFunctions.h"

#include "MainThreadUtils.h"
#include "mozilla/AppShutdown.h"
#include "mozilla/Assertions.h"
#include "mozilla/DataMutex.h"
#include "mozilla/DebugOnly.h"
#include "mozilla/Services.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/dom/RemoteType.h"
#include "mozIStorageBindingParamsArray.h"
#include "mozIStorageError.h"
#include "mozIStorageResultSet.h"
#include "mozIStorageRow.h"
#include "mozIStorageService.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsComponentManagerUtils.h"
#include "nsDirectoryServiceUtils.h"
#include "nsError.h"
#include "nsINavHistoryService.h"
#include "nsIObserverService.h"
#include "nsIWritablePropertyBag.h"
#include "nsPlacesMacros.h"
#include "nsServiceManagerUtils.h"
#include "nsThreadUtils.h"
#include "nsVariant.h"
#include "nsXULAppAPI.h"

namespace mozilla::places {

namespace {

// StaticDataMutex makes GetInstance() safe from any thread. StaticRefPtr
// avoids a static destructor; the reference is released explicitly in
// Shutdown() rather than requiring ClearOnShutdown().
constinit StaticDataMutex<StaticRefPtr<ConcurrentConnection>> sCCInstance{
    "ConcurrentConnection"};

already_AddRefed<nsIFile> GetDatabaseFileInProfile(const nsString& aName) {
  nsCOMPtr<nsIFile> file;
  NS_GetSpecialDirectory(NS_APP_USER_PROFILE_50_DIR, getter_AddRefs(file));
  if (file) {
    if (NS_SUCCEEDED(file->Append(aName))) {
      return file.forget();
    }
  }
  return nullptr;
}

class CallbackOnError final : public AsyncStatementCallback {
  using Method = void (ConcurrentConnection::*)();

 public:
  explicit CallbackOnError(ConcurrentConnection* aTarget, Method aMethod)
      : mMethod(aMethod), mTarget(aTarget) {}

  NS_IMETHOD HandleCompletion(uint16_t aReason) override {
    if (aReason == mozIStorageStatementCallback::REASON_ERROR) {
      (mTarget->*mMethod)();
    }
    return NS_OK;
  }

 private:
  Method mMethod;
  RefPtr<ConcurrentConnection> mTarget;
};

class CallbackOnComplete final : public mozIStorageCompletionCallback {
  using Method = void (ConcurrentConnection::*)(nsresult);

 public:
  NS_DECL_ISUPPORTS
  explicit CallbackOnComplete(ConcurrentConnection* aTarget, Method aMethod)
      : mMethod(aMethod), mTarget(aTarget) {}

  NS_IMETHOD Complete(nsresult aRv, nsISupports* aData) override {
    (mTarget->*mMethod)(aRv);
    return NS_OK;
  }

 private:
  ~CallbackOnComplete() = default;

  Method mMethod;
  RefPtr<ConcurrentConnection> mTarget;
};

NS_IMPL_ISUPPORTS(CallbackOnComplete, mozIStorageCompletionCallback)

}  // anonymous namespace

NS_IMPL_ISUPPORTS(ConcurrentConnection, nsIObserver, nsISupportsWeakReference,
                  nsIAsyncShutdownBlocker, mozIStorageCompletionCallback,
                  mozIStorageStatementCallback)

ConcurrentConnection::ConcurrentConnection() {
  MOZ_DIAGNOSTIC_ASSERT(IsSupportedProcessType(),
                        "Can only instantiate in supported processes");
}

void ConcurrentConnection::Init() {
  if (NS_IsMainThread()) {
    InitializeOnMainThread();
  } else {
    NS_DispatchToMainThread(NewRunnableMethod(
        "places::ConcurrentConnection::InitializeOnMainThread", this,
        &ConcurrentConnection::InitializeOnMainThread));
  }
}

void ConcurrentConnection::InitializeOnMainThread() {
  AssertIsOnMainThread();

  // Check shutdown and try to add this as a blocker.
  nsCOMPtr<nsIAsyncShutdownService> asyncShutdownSvc =
      services::GetAsyncShutdownService();
  MOZ_ASSERT(asyncShutdownSvc);
  if (AppShutdown::IsInOrBeyond(ShutdownPhase::AppShutdownConfirmed) ||
      !asyncShutdownSvc) {
    Shutdown();
    return;
  }

  // Can't use quit-application-granted here because gtests don't send it.
  nsCOMPtr<nsIAsyncShutdownClient> shutdownPhase;
  DebugOnly<nsresult> rv =
      asyncShutdownSvc->GetProfileChangeTeardown(getter_AddRefs(shutdownPhase));
  MOZ_ASSERT(NS_SUCCEEDED(rv), "Should be able to get shutdown phase");
  if (shutdownPhase) {
    nsresult rv = shutdownPhase->AddBlocker(
        this, NS_LITERAL_STRING_FROM_CSTRING(__FILE__), __LINE__, u""_ns);
    if (NS_FAILED(rv)) {
      this->Shutdown();
      MOZ_ASSERT(false, "Cannot add shutdown blocker");
      return;
    }
  }

  // TOPIC_PLACES_INIT_COMPLETE is fired by the parent-process Places service
  // and will never reach a content process.
  // Ideally when the content process sends a request, the parent should have
  // initialized Places already, but if that should become an issue, we may
  // either retry opening after a while, or find a way to notify the
  // content processes.
  if (XRE_IsParentProcess()) {
    nsCOMPtr<nsIObserverService> os = mozilla::services::GetObserverService();
    if (os) {
      MOZ_ALWAYS_SUCCEEDS(
          os->AddObserver(this, TOPIC_PLACES_INIT_COMPLETE, true));
    }
  }

  mState = AWAITING_DATABASE_READY;
  TryToOpenConnection();
}

void ConcurrentConnection::MaybeInterrupt() {
  AssertIsOnMainThread();
  RefPtr<ConcurrentConnection> instance;
  {
    auto lock = sCCInstance.Lock();
    instance = *lock;
  }
  if (instance) {
    instance->mConnectionReadyMutex.NoteOnMainThread();
    if (instance->mConn) {
      (void)instance->mConn->Interrupt();
    }
  }
}

bool ConcurrentConnection::IsSupportedProcessType() {
  if (XRE_IsParentProcess()) {
    return true;
  }
  if (!XRE_IsContentProcess()) {
    return false;
  }
  const auto* cc = dom::ContentChild::GetSingleton();
  if (!cc) {
    return false;
  }
  const nsACString& remoteType = cc->GetRemoteType();
  return remoteType == PRIVILEGEDABOUT_REMOTE_TYPE ||
         remoteType == PRIVILEGEDMOZILLA_REMOTE_TYPE;
}

Maybe<RefPtr<ConcurrentConnection>> ConcurrentConnection::GetInstance() {
  RefPtr<ConcurrentConnection> newInst;
  {
    auto lock = sCCInstance.Lock();
    if (*lock) {
      return Some(RefPtr<ConcurrentConnection>(*lock));
    }
    // Any instance created after AppShutdownConfirmed would call Shutdown()
    // immediately from InitializeOnMainThread(), so don't bother creating one.
    if (AppShutdown::IsInOrBeyond(ShutdownPhase::AppShutdownConfirmed)) {
      return Nothing();
    }
    if (!IsSupportedProcessType()) {
      return Nothing();
    }
    *lock = new ConcurrentConnection();
    newInst = *lock;
  }
  // Init() is called after releasing the lock to avoid a potential deadlock:
  // if called on the main thread, Init() runs InitializeOnMainThread()
  // synchronously, which may call Shutdown(), which re-acquires sCCInstance.
  newInst->Init();
  auto lock = sCCInstance.Lock();
  if (!*lock) {
    // Init() triggered an immediate Shutdown() (e.g. asyncShutdownSvc null).
    return Nothing();
  }
  return Some(RefPtr<ConcurrentConnection>(*lock));
}

// nsIAsyncShutdownBlocker
NS_IMETHODIMP
ConcurrentConnection::GetName(nsAString& aName) {
  aName.AssignLiteral("PlacesConcurrentConnection");
  return NS_OK;
}

// nsIAsyncShutdownBlocker
NS_IMETHODIMP
ConcurrentConnection::GetState(nsIPropertyBag** _state) {
  NS_ENSURE_ARG_POINTER(_state);
  nsCOMPtr<nsIWritablePropertyBag> bag =
      do_CreateInstance("@mozilla.org/hash-property-bag;1");
  NS_ENSURE_TRUE(bag, NS_ERROR_OUT_OF_MEMORY);
  RefPtr<nsVariant> progress = new nsVariant();
  MOZ_ALWAYS_SUCCEEDS(progress->SetAsUint8(mState));
  MOZ_ALWAYS_SUCCEEDS(
      bag->SetProperty(u"ConcurrentConnectionState"_ns, progress));
  bag.forget(_state);
  return NS_OK;
}

// nsIAsyncShutdownBlocker
NS_IMETHODIMP
ConcurrentConnection::BlockShutdown(nsIAsyncShutdownClient* aBarrierClient) {
  AssertIsOnMainThread();
  mShutdownBarrierClient = aBarrierClient;
  mState = AWAITING_DATABASE_CLOSED;
  mIsShuttingDown = true;

  // Start closing the connection, then call aBarrierClient.RemoveBlocker(this)
  // once done.
  if (mConn) {
    (void)mConn->Interrupt();
    CloseConnection();
  } else {
    Shutdown();
  }
  return NS_OK;
}

// mozIStorageCompletionCallback
NS_IMETHODIMP
ConcurrentConnection::Complete(nsresult aRv, nsISupports* aData) {
  AssertIsOnMainThread();

  // This is invoked as a consequence of connection opening, but the internal
  // connection handle is not yet available, nor ready for consumption.
  MOZ_ASSERT(!mConn);
#ifdef DEBUG
  mConnectionReadyMutex.NoteOnMainThread();
  if (mIsConnectionReady) {
    MOZ_CRASH("The connection should not be markes as ready yet");
  }
#endif

  // It's possible we got shutdown while the connection was being opened. We
  // don't even assign the connection, just try to close it.
  if (mIsShuttingDown && aData) {
    nsCOMPtr<mozIStorageAsyncConnection> conn = do_QueryInterface(aData);
    if (conn) {
      (void)conn->AsyncClose(nullptr);
    }
    mIsOpening = false;
    return NS_OK;
  }

  if (NS_FAILED(aRv)) {
    // The database file is not present or cannot be opened.
    // It's possible in the meanwhile Places was initialized, then we can try
    // again.
    if (mPlacesIsInitialized && mRetryOpening) {
      // We only retry once. mIsOpening stays true for the new open.
      mRetryOpening = false;
      TryToOpenConnection();
      return NS_OK;
    }
    mIsOpening = false;
    return NS_OK;
  }
  // Assign and setup connection.
  mConn = do_QueryInterface(aData);
  mIsOpening = false;

  // In some rare conditions WAL may return SQLITE_BUSY when the same database
  // is used across multiple threads, we must handle that.
  nsAutoCString busyTimeoutPragma("PRAGMA busy_timeout = ");
  busyTimeoutPragma.AppendInt(DATABASE_BUSY_TIMEOUT_MS);
  nsCOMPtr<mozIStoragePendingStatement> busyPs;
  (void)mConn->ExecuteSimpleSQLAsync(busyTimeoutPragma, nullptr,
                                     getter_AddRefs(busyPs));

  // Verify the schema version. If outdated, wait for Places to finish
  // initializing.
  nsCOMPtr<mozIStoragePendingStatement> schemaPs;
  nsresult rv = mConn->ExecuteSimpleSQLAsync("PRAGMA user_version"_ns, this,
                                             getter_AddRefs(schemaPs));
  if (NS_FAILED(rv)) {
    CloseConnection();
    Shutdown();
  }

  return NS_OK;
}

// mozIStorageStatementCallback
NS_IMETHODIMP ConcurrentConnection::HandleResult(
    mozIStorageResultSet* aResultSet) {
  // This is only invoked for PRAGMA user_version.
  nsCOMPtr<mozIStorageRow> row;
  if (NS_FAILED(aResultSet->GetNextRow(getter_AddRefs(row)))) {
    CloseConnection();
    Shutdown();
    return NS_OK;
  }
  mSchemaVersion = row->AsInt32(0);
  return NS_OK;
}

// mozIStorageStatementCallback
NS_IMETHODIMP ConcurrentConnection::HandleError(mozIStorageError* aError) {
#ifdef DEBUG
  int32_t result;
  nsresult rv = aError->GetResult(&result);
  NS_ENSURE_SUCCESS(rv, rv);
  nsAutoCString message;
  rv = aError->GetMessage(message);
  NS_ENSURE_SUCCESS(rv, rv);
  nsAutoCString warnMsg;
  warnMsg.AppendLiteral(
      "An error occurred while executing an async statement: ");
  warnMsg.AppendInt(result);
  warnMsg.Append(' ');
  warnMsg.Append(message);
  NS_WARNING(warnMsg.get());
#endif
  CloseConnection();
  return NS_OK;
}

// mozIStorageStatementCallback
NS_IMETHODIMP ConcurrentConnection::HandleCompletion(uint16_t aReason) {
  // This is only invoked for PRAGMA user_version.
  // Note mConn may have been destroyed at this point, for example during
  // shutdown. In that case we just do nothing.
  if (!mConn) {
    return NS_OK;
  }
  if (aReason == mozIStorageStatementCallback::REASON_FINISHED) {
    // If the schema version is not up to date we'll just retry later, once
    // Places initialization is complete.
    if (mSchemaVersion == nsINavHistoryService::DATABASE_SCHEMA_VERSION) {
      SetupConnection();
    } else {
      CloseConnection();
    }
  } else if (aReason == mozIStorageStatementCallback::REASON_CANCELED) {
    // The PRAGMA was interrupted (e.g. via MaybeInterrupt()). Close so the
    // connection can be reopened once Places is ready.
    CloseConnection();
  }
  return NS_OK;
}

void ConcurrentConnection::CloseConnection() {
  AssertIsOnMainThread();
  nsCOMPtr<mozIStorageAsyncConnection> conn;
  {
    MutexAutoLock lock(mConnectionReadyMutex.Lock());
    mConnectionReadyMutex.NoteExclusiveAccess();
    mIsConnectionReady = false;
    conn = mConn.forget();
  }

  if (mAsyncStatements) {
    mAsyncStatements->FinalizeStatements();
  }
  if (mHelperThreadStatements && conn) {
    RefPtr<FinalizeStatementCacheProxy<mozIStorageStatement>> event =
        new FinalizeStatementCacheProxy<mozIStorageStatement>(
            *mHelperThreadStatements, NS_ISUPPORTS_CAST(nsIObserver*, this));
    nsCOMPtr<nsIEventTarget> target = do_GetInterface(conn);
    if (target) {
      MOZ_ALWAYS_SUCCEEDS(target->Dispatch(event, NS_DISPATCH_NORMAL));
    }
  }

  nsCOMPtr<mozIStorageCompletionCallback> cb =
      MakeAndAddRef<CallbackOnComplete>(
          this, &ConcurrentConnection::CloseConnectionComplete);
  if (NS_FAILED(conn->AsyncClose(cb))) {
    Shutdown();
  }
}

void ConcurrentConnection::CloseConnectionComplete(nsresult rv) {
  AssertIsOnMainThread();
  if (mIsShuttingDown || NS_FAILED(rv)) {
    Shutdown();
    return;
  }
  // If Places is already initialized, retry opening, since the notification
  // won't fire again. This may happen, for example, if the connection was
  // interrupted during startup and then TOPIC_PLACES_INIT_COMPLETE fired.
  if (mPlacesIsInitialized && mRetryOpening) {
    mRetryOpening = false;
    TryToOpenConnection();
  }
}

void ConcurrentConnection::SetupConnection() {
  MOZ_ASSERT(mConn, "Connection must be defined at this point");
  AssertIsOnMainThread();

  // Create common functions.
  nsresult rv = Database::InitFunctions(mConn);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    CloseConnection();
    Shutdown();
    return;
  }

  // Attach favicons database.
  rv = AttachDatabase(DATABASE_FAVICONS_FILENAME, DATABASE_FAVICONS_SCHEMANAME);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    CloseConnection();
    Shutdown();
    return;
  }

  {
    MutexAutoLock lock(mConnectionReadyMutex.Lock());
    mConnectionReadyMutex.NoteExclusiveAccess();
    // Create the statements caches.
    mAsyncStatements = MakeUnique<AsyncStatementCache>(mConn);
    mHelperThreadStatements = MakeUnique<StatementCache>(mConn);
    mIsConnectionReady = true;
  }

  TryToConsumeQueues();
}

nsresult ConcurrentConnection::AttachDatabase(const nsString& aFileName,
                                              const nsCString& aSchemaName) {
  nsCOMPtr<nsIFile> databaseFile =
      GetDatabaseFileInProfile(DATABASE_FAVICONS_FILENAME);

  nsString path;
  nsresult rv = databaseFile->GetPath(path);
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<mozIStoragePendingStatement> ps;
  nsCOMPtr<mozIStorageStatementCallback> cb = MakeAndAddRef<CallbackOnError>(
      this, &ConcurrentConnection::CloseConnection);

  NS_ConvertUTF16toUTF8 utf8Path(path);

  const char* cPath = utf8Path.get();
  const char* cSchema = DATABASE_FAVICONS_SCHEMANAME.AsString().get();

  rv = mConn->AttachDatabase(cPath, cSchema, cb, getter_AddRefs(ps));
  NS_ENSURE_SUCCESS(rv, rv);

  return NS_OK;
}

// nsIObserver
NS_IMETHODIMP
ConcurrentConnection::Observe(nsISupports* aSubject, const char* aTopic,
                              const char16_t* aData) {
  AssertIsOnMainThread();
  if (strcmp(aTopic, TOPIC_PLACES_INIT_COMPLETE) == 0) {
    mPlacesIsInitialized = true;
    TryToOpenConnection();
  }
  return NS_OK;
}

void ConcurrentConnection::Queue(const nsCString& aSQL,
                                 PendingStatementCallback* aCallback) {
  if (!NS_IsMainThread()) {
    (void)NS_DispatchToMainThread(NS_NewRunnableFunction(
        "places::ConcurrentConnection::Queue",
        [self = RefPtr{this}, sql = nsCString(aSQL), cb = RefPtr{aCallback}]() {
          self->Queue(sql, cb.get());
        }));
    return;
  }
  AssertIsOnMainThread();
  if (mIsShuttingDown) {
    return;
  }
  mPendingQueries.PushFront(MakeAndAddRef<PendingQuery>(aSQL, aCallback));
  TryToConsumeQueues();
}

void ConcurrentConnection::Queue(Runnable* aRunnable) {
  if (!NS_IsMainThread()) {
    (void)NS_DispatchToMainThread(
        NS_NewRunnableFunction("places::ConcurrentConnection::Queue",
                               [self = RefPtr{this}, r = RefPtr{aRunnable}]() {
                                 self->Queue(r.get());
                               }));
    return;
  }
  AssertIsOnMainThread();
  if (mIsShuttingDown) {
    return;
  }
  mPendingRunnables.PushFront(aRunnable);
  TryToConsumeQueues();
}

already_AddRefed<mozIStorageStatement>
ConcurrentConnection::GetStatementOnHelperThread(const nsCString& aQuery) {
  if (NS_IsMainThread()) {
    MOZ_DIAGNOSTIC_CRASH("Use `GetStatement()` on the main-thread");
    return nullptr;
  }
  MutexAutoLock lock(mConnectionReadyMutex.Lock());
  mConnectionReadyMutex.NoteLockHeld();
  if (!mIsConnectionReady) {
    return nullptr;
  }
  nsCOMPtr<mozIStorageStatement> stmt =
      mHelperThreadStatements->GetCachedStatement(aQuery);
  if (stmt) {
    return stmt.forget();
  }
  return nullptr;
}

already_AddRefed<mozIStorageAsyncStatement> ConcurrentConnection::GetStatement(
    const nsCString& aQuery) {
  AssertIsOnMainThread();
  if (!NS_IsMainThread()) {
    MOZ_DIAGNOSTIC_CRASH(
        "Use `GetStatementOnHelperThread()` on the helper thread");
    return nullptr;
  }
  nsCOMPtr<mozIStorageAsyncStatement> stmt =
      mAsyncStatements->GetCachedStatement(aQuery);
  if (stmt) {
    return stmt.forget();
  }
  return nullptr;
}

void ConcurrentConnection::TryToConsumeQueues() {
  AssertIsOnMainThread();
  mConnectionReadyMutex.NoteOnMainThread();
  if (!mConn || !mIsConnectionReady) {
    return;
  }

  // Consume Runnables queue.
  if (mPendingRunnables.GetSize()) {
    nsCOMPtr<nsIEventTarget> target = do_GetInterface(mConn);
    while (target && mPendingRunnables.GetSize()) {
      RefPtr<Runnable> runnable = mPendingRunnables.Pop();
      MOZ_ALWAYS_SUCCEEDS(target->Dispatch(runnable, NS_DISPATCH_NORMAL));
    }
  }

  // Consume Statements queue.
  while (mPendingQueries.GetSize()) {
    RefPtr<PendingQuery> query = mPendingQueries.Pop();
    nsCOMPtr<mozIStorageAsyncStatement> stmt = GetStatement(query->mSQL);
    if (NS_WARN_IF(!stmt)) continue;
    nsCOMPtr<mozIStorageBindingParamsArray> paramsArray;
    nsresult rv = stmt->NewBindingParamsArray(getter_AddRefs(paramsArray));
    if (NS_WARN_IF(NS_FAILED(rv))) continue;
    rv = query->mCallback->BindParams(paramsArray);
    if (NS_WARN_IF(NS_FAILED(rv))) continue;
    rv = stmt->BindParameters(paramsArray);
    if (NS_WARN_IF(NS_FAILED(rv))) continue;
    nsCOMPtr<mozIStoragePendingStatement> ps;
    rv = stmt->ExecuteAsync(query->mCallback, getter_AddRefs(ps));
    if (NS_WARN_IF(NS_FAILED(rv))) continue;
  }
}

void ConcurrentConnection::TryToOpenConnection() {
  AssertIsOnMainThread();
  mConnectionReadyMutex.NoteOnMainThread();
  // Avoid re-entering as this may be invoked multiple times. mIsOpening is
  // used until mConn is assigned.
  if (mIsShuttingDown || mIsOpening || mConn) {
    return;
  }

  mIsOpening = true;

  // Any error here means we'll be unable to do anything, thus we just shutdown.
#define SHUTDOWN_AND_RETURN_IF_FALSE(condition) \
  PR_BEGIN_MACRO                                \
  if (!(condition)) {                           \
    Shutdown();                                 \
    return;                                     \
  }                                             \
  PR_END_MACRO

  nsCOMPtr<mozIStorageService> storageSvc =
      do_GetService(MOZ_STORAGE_SERVICE_CONTRACTID);
  SHUTDOWN_AND_RETURN_IF_FALSE(storageSvc);

  nsCOMPtr<nsIFile> dbFile = GetDatabaseFileInProfile(DATABASE_FILENAME);
  SHUTDOWN_AND_RETURN_IF_FALSE(dbFile);
  RefPtr<nsVariant> variant = new nsVariant();
  nsresult rv = variant->SetAsInterface(NS_GET_IID(nsIFile), dbFile);
  SHUTDOWN_AND_RETURN_IF_FALSE(NS_SUCCEEDED(rv));
  // We use no locking to avoid interfering with Database trying to get an
  // exclusive lock later as the only writer.
  rv = storageSvc->OpenAsyncDatabase(
      variant, mozIStorageService::OPEN_READONLY,
      mozIStorageService::CONNECTION_INTERRUPTIBLE, this);
  SHUTDOWN_AND_RETURN_IF_FALSE(NS_SUCCEEDED(rv));

#undef SHUTDOWN_AND_RETURN_IF_FALSE
}

void ConcurrentConnection::Shutdown() {
  // Keep a strong reference: nulling sCCInstance below drops the singleton's
  // RefPtr, which could be the last one, destroying us mid-method.
#ifdef DEBUG
  AssertIsOnMainThread();
  mConnectionReadyMutex.NoteOnMainThread();
  MOZ_ASSERT(!mConn, "Connection should have been closed");
  if (mIsConnectionReady) {
    MOZ_CRASH("Connection should be closed");
  }
#endif

  RefPtr<ConcurrentConnection> kungFuDeathGrip = this;
  {
    auto lock = sCCInstance.Lock();
    // From this point GetInstance() returns Nothing().
    *lock = nullptr;
  }

  mConn = nullptr;
  mIsOpening = false;
  mIsShuttingDown = true;
  mState = CLOSED;

  // Clear the queues, as we can't handle them anymore.
  mPendingQueries.Erase();
  mPendingRunnables.Erase();

  // Stop blocking shutdown.
  if (mShutdownBarrierClient) {
    MOZ_ALWAYS_SUCCEEDS(mShutdownBarrierClient->RemoveBlocker(this));
  }
}

}  // namespace mozilla::places
