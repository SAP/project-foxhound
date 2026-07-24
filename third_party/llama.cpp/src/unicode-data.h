#pragma once

#include <cstdint>
#include <vector>
#include <unordered_map>
#include <unordered_set>

struct range_nfd {
    uint32_t first;
    uint32_t last;
    uint32_t nfd;
};

static const uint32_t MAX_CODEPOINTS = 0x110000;

const std::initializer_list<std::pair<uint32_t, uint16_t>>& get_unicode_ranges_flags();
const std::unordered_set<uint32_t>& get_unicode_set_whitespace();
const std::initializer_list<std::pair<uint32_t, uint32_t>>& get_unicode_map_lowercase();
const std::initializer_list<std::pair<uint32_t, uint32_t>>& get_unicode_map_uppercase();
const std::initializer_list<range_nfd>& get_unicode_ranges_nfd();
