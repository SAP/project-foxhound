/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/PerfStats.h"
#include "nsAppRunner.h"
#include "nsTArray.h"
#include <string_view>
#include "mozilla/dom/BrowserParent.h"
#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/dom/ContentParent.h"
#include "mozilla/dom/ContentProcessManager.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "mozilla/gfx/GPUChild.h"
#include "mozilla/gfx/GPUProcessManager.h"
#include "mozilla/JSONStringWriteFuncs.h"

using namespace mozilla::dom;
using namespace mozilla::gfx;

namespace mozilla {

#define METRIC_NAME(metric) #metric,
static const char* const sMetricNames[] = {
    FOR_EACH_PERFSTATS_METRIC(METRIC_NAME)
#undef METRIC_NAME
        "Invalid"};

void PerfStats::SetCollectionMask(MetricMask aMask) {
  detail::sPerfStatsCollectionMask = aMask;
  GetSingleton()->ResetCollection();

  if (!XRE_IsParentProcess()) {
    return;
  }

  GPUProcessManager* gpuManager = GPUProcessManager::Get();
  GPUChild* gpuChild = nullptr;

  if (gpuManager) {
    gpuChild = gpuManager->GetGPUChild();
    if (gpuChild) {
      gpuChild->SendUpdatePerfStatsCollectionMask(aMask);
    }
  }

  nsTArray<ContentParent*> contentParents;
  ContentParent::GetAll(contentParents);

  for (ContentParent* parent : contentParents) {
    (void)parent->SendUpdatePerfStatsCollectionMask(aMask);
  }
}

PerfStats::MetricMask PerfStats::GetCollectionMask() {
  return detail::sPerfStatsCollectionMask;
}

RefPtr<PerfStats::PerfStatsPromise> PerfStats::CollectPerfStatsJSON() {
  return GetSingleton()->CollectPerfStatsJSONInternal();
}

std::string PerfStats::CollectLocalPerfStatsJSON() {
  return GetSingleton()->CollectLocalPerfStatsJSONInternal();
}

void PerfStats::StorePerfStats(dom::ContentParent* aParent,
                               const std::string& aPerfStats) {
  GetSingleton()->StorePerfStatsInternal(aParent, aPerfStats);
}

PerfStats::MetricMask PerfStats::GetFeatureMask(const char* aMetricName) {
  for (int i = 0; i < static_cast<int>(Metric::Max); i++) {
    if (std::string_view(aMetricName) == std::string_view(sMetricNames[i])) {
      return 1ULL << i;
    }
  }

  return 0;
}

void AppendJSONStringAsProperty(nsCString& aDest, const char* aPropertyName,
                                const nsACString& aJSON) {
  // We need to manually append into the string here, since JSONWriter has no
  // way to allow us to write an existing JSON object into a property.
  aDest.Append(",\n\"");
  aDest.Append(aPropertyName);
  aDest.Append("\": ");
  aDest.Append(aJSON);
}

static void WriteContentParent(nsCString& aRawString, JSONWriter& aWriter,
                               const nsACString& aString,
                               ContentParent* aParent) {
  aWriter.StringProperty("type", "content");
  aWriter.IntProperty("id", aParent->ChildID());
  const ManagedContainer<PBrowserParent>& browsers =
      aParent->ManagedPBrowserParent();

  aWriter.StartArrayProperty("urls");
  for (const auto& key : browsers) {
    // This only reports -current- URLs, not ones that may have been here in
    // the past, this is unfortunate especially for processes which are dying
    // and that have no more active URLs.
    RefPtr<BrowserParent> parent = BrowserParent::GetFrom(key);

    CanonicalBrowsingContext* ctx = parent->GetBrowsingContext();
    if (!ctx) {
      continue;
    }

    WindowGlobalParent* windowGlobal = ctx->GetCurrentWindowGlobal();
    if (!windowGlobal) {
      continue;
    }

    RefPtr<nsIURI> uri = windowGlobal->GetDocumentURI();
    if (!uri) {
      continue;
    }

    nsAutoCString url;
    uri->GetSpec(url);

    aWriter.StringElement(url);
  }
  aWriter.EndArray();
  AppendJSONStringAsProperty(aRawString, "perfstats", aString);
}

struct PerfStatsCollector {
  PerfStatsCollector() : writer(MakeUnique<JSONStringRefWriteFunc>(string)) {}

  void AppendPerfStats(const nsCString& aString, ContentParent* aParent) {
    writer.StartObjectElement();
    WriteContentParent(string, writer, aString, aParent);
    writer.EndObject();
  }

  void AppendPerfStats(const nsCString& aString, GPUChild* aChild) {
    writer.StartObjectElement();
    writer.StringProperty("type", "gpu");
    writer.IntProperty("id", aChild->Id());
    AppendJSONStringAsProperty(string, "perfstats", aString);
    writer.EndObject();
  }

  ~PerfStatsCollector() {
    writer.EndArray();
    writer.End();
    promise.Resolve(std::string(string.Data(), string.Length()), __func__);
  }
  nsCString string;
  JSONWriter writer;
  MozPromiseHolder<PerfStats::PerfStatsPromise> promise;
};

void PerfStats::ResetCollection() {
  for (MetricMask i = 0; i < static_cast<MetricMask>(Metric::Max); i++) {
    if (!(detail::sPerfStatsCollectionMask & MetricMask(1) << i)) {
      continue;
    }

    mRecordedTimes[i] = 0.0;
    mRecordedCounts[i] = 0;
  }

  mStoredPerfStats.clear();
}

void PerfStats::StorePerfStatsInternal(dom::ContentParent* aParent,
                                       const std::string& aPerfStats) {
  nsCString jsonString;
  JSONStringRefWriteFunc jw(jsonString);
  JSONWriter w(jw);

  // To generate correct JSON here we don't call start and end. That causes
  // this to use Single Line mode, sadly.
  WriteContentParent(jsonString, w,
                     nsCString(aPerfStats.c_str(), aPerfStats.length()),
                     aParent);

  mStoredPerfStats.push_back(
      std::string(jsonString.Data(), jsonString.Length()));
}

auto PerfStats::CollectPerfStatsJSONInternal() -> RefPtr<PerfStatsPromise> {
  if (!detail::sPerfStatsCollectionMask) {
    return PerfStatsPromise::CreateAndReject(false, __func__);
  }

  if (!XRE_IsParentProcess()) {
    return PerfStatsPromise::CreateAndResolve(
        CollectLocalPerfStatsJSONInternal(), __func__);
  }

  std::shared_ptr<PerfStatsCollector> collector =
      std::make_shared<PerfStatsCollector>();

  JSONWriter& w = collector->writer;

  w.Start();
  {
    w.StartArrayProperty("processes");
    {
      w.StartObjectElement();
      {
        w.StringProperty("type", "parent");
        auto localStats = CollectLocalPerfStatsJSONInternal();
        AppendJSONStringAsProperty(
            collector->string, "perfstats",
            nsCString(localStats.c_str(), localStats.length()));
      }
      w.EndObject();

      // Append any processes that closed earlier.
      for (const std::string& string : mStoredPerfStats) {
        w.StartObjectElement();
        // This trick makes indentation even more messed up than it already
        // was. However it produces technically correct JSON.
        collector->string.Append(string.c_str(), string.length());
        w.EndObject();
      }
      // We do not clear this, we only clear stored perfstats when the mask is
      // reset.

      GPUProcessManager* gpuManager = GPUProcessManager::Get();
      GPUChild* gpuChild = nullptr;

      if (gpuManager) {
        gpuChild = gpuManager->GetGPUChild();
      }
      nsTArray<ContentParent*> contentParents;
      ContentParent::GetAll(contentParents);

      if (gpuChild) {
        gpuChild->SendCollectPerfStatsJSON(
            [collector,
             gpuChild = RefPtr{gpuChild}](const std::string& aString) {
              collector->AppendPerfStats(
                  nsCString(aString.c_str(), aString.length()), gpuChild);
            },
            // The only feasible errors here are if something goes wrong in the
            // the bridge, we choose to ignore those.
            [](mozilla::ipc::ResponseRejectReason) {});
      }
      for (ContentParent* parent : contentParents) {
        RefPtr<ContentParent> parentRef = parent;
        parent->SendCollectPerfStatsJSON(
            [collector, parentRef](const nsCString& aString) {
              collector->AppendPerfStats(aString, parentRef.get());
            },
            // The only feasible errors here are if something goes wrong in the
            // the bridge, we choose to ignore those.
            [](mozilla::ipc::ResponseRejectReason) {});
      }
    }
  }

  return collector->promise.Ensure(__func__);
}

std::string PerfStats::CollectLocalPerfStatsJSONInternal() {
  JSONStringWriteFunc<nsCString> jw;
  JSONWriter w(jw);
  w.Start();
  {
    w.StartArrayProperty("metrics");
    {
      for (MetricMask i = 0; i < static_cast<MetricMask>(Metric::Max); i++) {
        if (!(detail::sPerfStatsCollectionMask & (MetricMask(1) << i))) {
          continue;
        }

        w.StartObjectElement();
        {
          w.IntProperty("id", i);
          w.StringProperty("metric", MakeStringSpan(sMetricNames[i]));
          w.DoubleProperty("time", mRecordedTimes[i]);
          w.IntProperty("count", mRecordedCounts[i]);
        }
        w.EndObject();
      }
    }
    w.EndArray();
  }
  w.End();

  const nsCString& s = jw.StringCRef();
  return std::string(s.Data(), s.Length());
}

}  // namespace mozilla
