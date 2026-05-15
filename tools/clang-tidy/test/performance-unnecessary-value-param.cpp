#include "structures.h"

namespace mozilla {
  struct EnumSet {
    // Add non-trivial copy constructor.
    EnumSet(const EnumSet&) {}
  };

  struct Range {
    // Add non-trivial copy constructor.
    Range(const Range&) {}
  };
}

void f(const std::string Value) {
}

void f(mozilla::EnumSet Value) {
}

void f(mozilla::Range Value) {
}
