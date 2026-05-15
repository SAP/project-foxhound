/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

macro_rules! include_proto {
    ($path:literal) => {
        include!(mozbuild::srcdir_path!(concat!(
            "third_party/opentelemetry-cpp/third_party/opentelemetry-proto/",
            $path
        )));
    };
}

pub mod opentelemetry {
    // Third party code is included here, and we want its warnings to be
    // ignored similarly to other third party code.
    #[allow(warnings)]
    pub mod proto {
        pub mod common {
            pub mod v1 {
                include_proto!("opentelemetry.proto.common.v1.rs");
            }
        }
        pub mod trace {
            pub mod v1 {
                include_proto!("opentelemetry.proto.trace.v1.rs");
            }
        }
        pub mod resource {
            pub mod v1 {
                include_proto!("opentelemetry.proto.resource.v1.rs");
            }
        }
        pub mod collector {
            pub mod trace {
                pub mod v1 {
                    include_proto!("opentelemetry.proto.collector.trace.v1.rs");
                }
            }
        }
    }
}
