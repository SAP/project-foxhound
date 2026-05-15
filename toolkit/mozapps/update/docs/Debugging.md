# Application Update Debugging

This page is intended to help developers figure out problems that they can
reproduce locally or to test changes.

## Determining the Update URL Being Used

When updates aren't returning what we expect, it can be valuable to make sure
that we are using the expected update URL. This can be a bit trickier than
expected since there are multiple things that influence it. Checking it from the
wrong place could result in an incorrect value being given. The correct command
is:

```JS
const checker = Cc["@mozilla.org/updates/update-checker;1"].getService(Ci.nsIUpdateChecker);
await checker.wrappedJSObject.getUpdateURL(checker.BACKGROUND_CHECK);
```

## Kicking Off a Background Update

Sometimes, in testing, we may want to initiate an update as if it was launched
by Firefox checking in the background rather than checking using an update UI.
This can be done with this command:

```JS
Cc["@mozilla.org/updates/update-service;1"].getService(Ci.nsITimerCallback).notify(null);
```

## Debugging the Update Binary in an Automated Test

Sometimes it can be a real struggle to figure out why the update binary is
acting unexpectedly in testing. And attaching a debugger to something that runs
so briefly can be difficult. In this situation, you can add these lines
[here](https://searchfox.org/mozilla-central/rev/679ebe4ffdc7312e42d55badb02ef89336af8223/toolkit/mozapps/update/tests/data/xpcshellUtilsAUS.js#2065):

```JS
  let debuggerPath =
    "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\Common7\\IDE\\devenv.exe";

  args.unshift(launchBin.path);
  args.unshift("/DebugExe");
  launchBin = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  launchBin.initWithPath(debuggerPath);
```

## Running Update for a Local Build

Note: This has not been updated since the addition of `./mach update serve` in
[Bug 1655128](https://bugzilla.mozilla.org/show_bug.cgi?id=1655128). It could
probably be simplified by using that.

See the main documentation for this, [here](SettingUpAnUpdateServer.rst).

This script is meant to automate this process but is currently not designed to
be very portable and thus will require some setup:

- The build directory should use a `mozconfig` file including
  `ac_add_options --enable-unverified-updates` and should specify the object
  directory using
  `mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/<insert dir name here>`. Note that a
  full rebuild will be necessary after changing these values.
- Make a directory to serve updates from (referred to later as
  `fake_update_directory`). Open a terminal instance running
  `python3 -m http.server 8000` in that directory.
- You will need an application or script that can calculate sha512 hashes. The
  example script below uses
  [this one](https://github.com/bytesized/utilities/blob/master/python/bin/digest).
- The 3 variables at the top of this script will also need to be set properly.
  The update directory can most easily be found by just running Firefox from the
  directory it will be installed into and checking `about:support`. Ideally,
  this script would calculate the update directory itself, but it seems quite a
  bit harder to calculate a
  [City Hash](https://searchfox.org/firefox-main/source/other-licenses/nsis/Contrib/CityHash)
  (or find another tool that can) than to just have Firefox calculate the update
  directory for you.

It is expected that this script will be run from the root of the build
directory.

```BASH
#!/bin/bash
set -e

# fake_update_directory is where the XML and MAR will be written
fake_update_directory="${HOME}/proj/fake_updater"
install_parent_dir="${HOME}/local_install"
# The contents of update_directory will be deleted when this script runs to
# prevent an old update from being installed
update_dir="/c/ProgramData/Mozilla-1de4eec8-1241-4177-a864-e594e8d1fb38/updates/D08B6C7768F21D1D"


mar_template=$(cat <<'END_HEREDOC'
<?xml version="1.0" encoding="UTF-8"?>
<updates>
    <update type="minor" displayVersion="2000.0a1" appVersion="2000.0a1" platformVersion="2000.0a1" buildID="21181002100236">
        <patch type="complete" URL="http://127.0.0.1:8000/local_update.mar" hashFunction="sha512" hashValue="%HASH_VALUE%" size="%SIZE%"/>
    </update>
</updates>
END_HEREDOC
)

policy_contents=$(cat <<'END_HEREDOC'
{
  "policies": {
    "AppUpdateURL": "http://127.0.0.1:8000/update.xml"
  }
}
END_HEREDOC
)


if [[ ! -f "mach" ]] || [[ ! -f "mozconfig" ]] ; then
  echo "This doesn't look like mozilla-central"
  exit -1
fi

obj_dir="$(grep '^mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/' mozconfig | sed 's|^mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/||')"

if [[ $(echo "$obj_dir" | wc -l) -gt 1 ]] || [[ -z "$obj_dir" ]]; then
  echo "Unable to determine object directory"
  exit -1
fi
echo "Determined object directory to be \"${obj_dir}\""
if [[ ! -d "$obj_dir" ]]; then
  echo "Object directory doesn't exist"
  exit -1
fi

echo "Building..."
MOZ_NOSPAM="true" ./mach build &> /dev/null
echo "Packaging..."
MOZ_NOSPAM="true" ./mach package &> /dev/null
echo "Creating MAR at \"${fake_update_directory}/local_update.mar\"..."
touch "${obj_dir}/dist/firefox/precomplete"
MAR="${obj_dir}/dist/host/bin/mar.exe" MOZ_PRODUCT_VERSION="2000.0a1" MAR_CHANNEL_ID="default" ./tools/update-packaging/make_full_update.sh "${fake_update_directory}/local_update.mar" "${obj_dir}/dist/firefox" &> /dev/null

# Make the installation
echo "Installing Firefox to \"${install_parent_dir}/firefox\"..."
rm -rf "${install_parent_dir}/firefox" &> /dev/null
cp -r "${obj_dir}/dist/firefox" "$install_parent_dir" &> /dev/null

# Add the update URL policy
echo "Adding the update URL policy..."
mkdir "${install_parent_dir}/firefox/distribution"
echo "$policy_contents" > "${install_parent_dir}/firefox/distribution/policies.json"

# Clear out the update directory
if [[ -z "$update_dir" ]]; then
  echo "Configuration error. It doesn't look like the update directory is defined"
  exit -1
fi
update_config_path="${update_dir}/update-config.json"
update_config_contents=
if [[ -f "${update_config_path}" ]]; then
  echo "Saving update config from the update directory"
  update_config_contents="$(cat "${update_config_path}")"
fi
echo "Clearing out the update files in \"${update_dir}\""
rm -rf "${update_dir}"/* &> /dev/null
if [[ -n "$update_config_contents" ]]; then
  echo "Restoring update config"
  echo "${update_config_contents}" > "${update_config_path}"
fi

# Write out the update XML
echo "Writing update XML to \"${fake_update_directory}/update.xml\"..."
size="$($(which ls) -l "${fake_update_directory}/local_update.mar" | cut -d " " -f5)"
hash="$(digest sha512 -q "${fake_update_directory}/local_update.mar")"
mar_contents="$(echo "$mar_template" | sed "s|%HASH_VALUE%|${hash}|g;s|%SIZE%|${size}|g")"
echo "$mar_contents" > "${fake_update_directory}/update.xml"

echo
echo "Done."
```

This sets Firefox up to run through the update process such that it is updated
to run the same thing that was already running. This allows multiple passes of
testing without having to reinstall. When changes are made, run the script again
before testing further.
