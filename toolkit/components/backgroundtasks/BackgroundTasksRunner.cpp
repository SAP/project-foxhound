/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/BackgroundTasksRunner.h"

#include "base/process_util.h"
#include "mozilla/StaticPrefs_toolkit.h"
#include "mozilla/StaticPrefs_datareporting.h"
#include "nsIFile.h"

#ifdef XP_WIN
#  include "mozilla/AssembleCmdLine.h"
#endif

namespace mozilla {

NS_IMPL_ISUPPORTS(BackgroundTasksRunner, nsIBackgroundTasksRunner);

NS_IMETHODIMP BackgroundTasksRunner::RunInDetachedProcess(
    const nsACString& aTaskName, const nsTArray<nsCString>& aArgs) {
  nsCOMPtr<nsIFile> lf;
  nsresult rv = XRE_GetBinaryPath(getter_AddRefs(lf));
  NS_ENSURE_SUCCESS(rv, rv);

  nsAutoCString exePath;
#if !defined(XP_WIN)
  rv = lf->GetNativePath(exePath);
#else
  rv = lf->GetNativeTarget(exePath);
#endif
  NS_ENSURE_SUCCESS(rv, rv);

  base::LaunchOptions options;
#ifdef XP_WIN
  options.start_independent = true;

  nsTArray<const char*> argv = {exePath.Data(), "--backgroundtask",
                                aTaskName.Data()};
  for (const nsCString& str : aArgs) {
    argv.AppendElement(str.get());
  }
  argv.AppendElement(nullptr);

  wchar_t* assembledCmdLine = nullptr;
  if (assembleCmdLine(argv.Elements(), &assembledCmdLine, CP_UTF8) == -1) {
    return NS_ERROR_FAILURE;
  }

  if (!base::LaunchApp(assembledCmdLine, options, nullptr)) {
    return NS_ERROR_FAILURE;
  }
#else
  std::vector<std::string> argv = {exePath.Data(), "--backgroundtask",
                                   aTaskName.Data()};
  for (const nsCString& str : aArgs) {
    argv.push_back(str.get());
  }

  if (!base::LaunchApp(argv, options, nullptr)) {
    return NS_ERROR_FAILURE;
  }
#endif

  return NS_OK;
}

NS_IMETHODIMP BackgroundTasksRunner::RemoveDirectoryInDetachedProcess(
    const nsACString& aParentDirPath, const nsACString& aChildDirName,
    const nsACString& aSecondsToWait, const nsACString& aOtherFoldersSuffix,
    const nsACString& aMetricsId) {
  nsTArray<nsCString> argv = {aParentDirPath + ""_ns, aChildDirName + ""_ns,
                              aSecondsToWait + ""_ns,
                              aOtherFoldersSuffix + ""_ns};

  uint32_t testingSleepMs =
      StaticPrefs::toolkit_background_tasks_remove_directory_testing_sleep_ms();
  if (testingSleepMs > 0) {
    argv.AppendElement("--test-sleep");
    nsAutoCString sleep;
    sleep.AppendInt(testingSleepMs);
    argv.AppendElement(sleep);
  }
  if (!aMetricsId.IsEmpty() &&
      StaticPrefs::datareporting_healthreport_uploadEnabled()) {
    argv.AppendElement("--metrics-id");
    argv.AppendElement(aMetricsId);
  }

  return RunInDetachedProcess("removeDirectory"_ns, argv);
}

}  // namespace mozilla
