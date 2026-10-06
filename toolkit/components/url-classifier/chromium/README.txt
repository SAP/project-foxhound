# Overview

'safebrowsing.proto' is modified from [1] with the following changes:

- Added "package mozilla.safebrowsing;"
- Added more threatHit information

##################################
  // Client-reported identification.
  optional ClientInfo client_info = 5;

  // Details about the user that encountered the threat.
  message UserInfo {
    // The UN M.49 region code associated with the user's location.
    optional string region_code = 1;

    // Unique ID stable over a week or two
    optional bytes user_id = 2;
  }

  // Details about the user that encountered the threat.
  optional UserInfo user_info = 6;
####################################

to avoid naming pollution. We use this source file along with protobuf compiler (protoc) to generate safebrowsing.pb.h/cc for safebrowsing v4 update and hash completion.

'safebrowsing_v5.proto' is based on [5] with below adjustments.

- Change the package namespace to 'mozilla.safebrowsing.v5'
- Remove unnecessary imports and annotations.
- Remove unnecessary options.
- Replace the google.protobuf.Duration with a local Duration message with the
  same format.
- Remove the service section that is not used in Gecko.
- Add option to enable optimization for the lite runtime.

The safebrowsing_v5.patch captures all changes to the safebrowsing_v5.proto.

# Update

If you want to update to the latest upstream version,

1. Checkout the latest proto files[2][4].
2. Use protoc to generate safebrowsing.pb.h and safebrowsing.pb.cc. For example,

$ protoc -I=. --cpp_out="../protobuf/" safebrowsing.proto

(Note that we should regenerate the header and source files when Gecko's protobuf upgrades, it's currently handled by the regeneration script[4].)

[1] https://chromium.googlesource.com/chromium/src.git/+/9c4485f1ce7cac7ae82f7a4ae36ccc663afe806c/components/safe_browsing_db/safebrowsing.proto
[2] https://chromium.googlesource.com/chromium/src.git/+/master/components/safe_browsing_db/safebrowsing.proto
[3] https://github.com/google/protobuf/releases/tag/v2.6.1
[4] https://searchfox.org/firefox-main/source/toolkit/components/protobuf/regenerate_cpp_files.sh
[5] https://github.com/googleapis/googleapis/blob/master/google/security/safebrowsing/v5/safebrowsing.proto
