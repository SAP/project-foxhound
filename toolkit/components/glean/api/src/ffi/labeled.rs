// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

#![cfg(feature = "with_gecko")]

use crate::metrics::__glean_metric_maps as metric_maps;
use nsstring::{nsACString, nsCString};
use thin_vec::ThinVec;

fn is_jog_id(id: u32) -> bool {
    id & (1 << crate::factory::DYNAMIC_METRIC_BIT) > 0
}

#[no_mangle]
pub extern "C" fn fog_labeled_enum_to_str(id: u32, label: u16, value: &mut nsACString) {
    let val = metric_maps::labeled_enum_to_str(id, label);
    value.assign(&val);
}

#[no_mangle]
pub extern "C" fn fog_labeled_boolean_get(id: u32, label: &nsACString) -> u32 {
    let label = &label.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            LABELED_BOOLEAN_MAP,
            id,
            metric,
            metric.get_submetric_id(label)
        )
    } else {
        metric_maps::labeled_submetric_id_get(id, label)
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_boolean_enum_get(id: u32, label: u16) -> u32 {
    assert!(!is_jog_id(id), "No enum_get support for JOG");
    metric_maps::labeled_submetric_id_get(id, metric_maps::labeled_enum_to_str(id, label))
}

#[no_mangle]
pub extern "C" fn fog_labeled_boolean_test_get_value(
    id: u32,
    ping_name: &nsACString,
    count: &mut u64,
    keys: &mut ThinVec<nsCString>,
    values: &mut ThinVec<bool>,
) {
    let val;
    if is_jog_id(id) {
        val = just_with_jog_metric!(
            LABELED_BOOLEAN_MAP,
            id,
            metric,
            test_get!(metric, ping_name)
        );
    } else {
        let ping_name = &ping_name.to_utf8();
        val = metric_maps::labeled_boolean_test_get(id, ping_name).unwrap();
    }
    *count = val.len() as _;
    for (key, value) in val {
        keys.push(nsCString::from(key));
        values.push(value as _);
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_boolean_test_get_error(id: u32, error_str: &mut nsCString) -> bool {
    let err;
    if is_jog_id(id) {
        err = just_with_jog_metric!(LABELED_BOOLEAN_MAP, id, metric, test_get_errors!(metric));
    } else {
        err = test_get_errors_with_method!(
            metric_maps,
            labeled_boolean_test_get_num_recorded_errors,
            id
        );
    }
    err.map(|err_str| error_str.assign(&err_str)).is_some()
}

#[no_mangle]
pub extern "C" fn fog_labeled_counter_get(id: u32, label: &nsACString) -> u32 {
    let label = &label.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            LABELED_COUNTER_MAP,
            id,
            metric,
            metric.get_submetric_id(label)
        )
    } else {
        metric_maps::labeled_submetric_id_get(id, label)
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_counter_enum_get(id: u32, label: u16) -> u32 {
    assert!(!is_jog_id(id), "No enum_get support for JOG");
    metric_maps::labeled_submetric_id_get(id, metric_maps::labeled_enum_to_str(id, label))
}

#[no_mangle]
pub extern "C" fn fog_labeled_counter_test_get_value(
    id: u32,
    ping_name: &nsACString,
    count: &mut u64,
    keys: &mut ThinVec<nsCString>,
    values: &mut ThinVec<i32>,
) {
    let val;
    if is_jog_id(id) {
        val = just_with_jog_metric!(
            LABELED_COUNTER_MAP,
            id,
            metric,
            test_get!(metric, ping_name)
        );
    } else {
        let ping_name = &ping_name.to_utf8();
        val = metric_maps::labeled_counter_test_get(id, ping_name).unwrap();
    }
    *count = val.len() as _;
    for (key, value) in val {
        keys.push(nsCString::from(key));
        values.push(value as _);
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_counter_test_get_error(id: u32, error_str: &mut nsCString) -> bool {
    let err;
    if is_jog_id(id) {
        err = just_with_jog_metric!(LABELED_COUNTER_MAP, id, metric, test_get_errors!(metric));
    } else {
        err = test_get_errors_with_method!(
            metric_maps,
            labeled_counter_test_get_num_recorded_errors,
            id
        );
    }
    err.map(|err_str| error_str.assign(&err_str)).is_some()
}

#[no_mangle]
pub extern "C" fn fog_labeled_custom_distribution_get(id: u32, label: &nsACString) -> u32 {
    let label = &label.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            LABELED_CUSTOM_DISTRIBUTION_MAP,
            id,
            metric,
            metric.get_submetric_id(label)
        )
    } else {
        metric_maps::labeled_submetric_id_get(id, label)
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_custom_distribution_enum_get(id: u32, label: u16) -> u32 {
    assert!(!is_jog_id(id), "No enum_get support for JOG");
    metric_maps::labeled_submetric_id_get(id, metric_maps::labeled_enum_to_str(id, label))
}

/// FFI-compatible representation of recorded distribution data.
#[repr(C)]
pub struct FfiDistributionData {
    keys: ThinVec<i64>,
    values: ThinVec<i64>,
    sum: i64,
    count: i64,
}

impl From<glean::DistributionData> for FfiDistributionData {
    fn from(data: glean::DistributionData) -> Self {
        let mut keys = ThinVec::new();
        let mut values = ThinVec::new();

        for (key, value) in data.values {
            keys.push(key);
            values.push(value);
        }

        FfiDistributionData {
            keys,
            values,
            sum: data.sum,
            count: data.count,
        }
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_custom_distribution_test_get_value(
    id: u32,
    ping_name: &nsACString,
    count: &mut u64,
    keys: &mut ThinVec<nsCString>,
    values: &mut ThinVec<FfiDistributionData>,
) {
    let val;
    if is_jog_id(id) {
        val = just_with_jog_metric!(
            LABELED_CUSTOM_DISTRIBUTION_MAP,
            id,
            metric,
            test_get!(metric, ping_name)
        );
    } else {
        let ping_name = &ping_name.to_utf8();
        val = metric_maps::labeled_custom_distribution_test_get(id, ping_name).unwrap();
    }
    *count = val.len() as _;
    for (key, value) in val {
        keys.push(nsCString::from(key));
        values.push(FfiDistributionData::from(value));
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_custom_distribution_test_get_error(
    id: u32,
    error_str: &mut nsCString,
) -> bool {
    let err;
    if is_jog_id(id) {
        err = just_with_jog_metric!(
            LABELED_CUSTOM_DISTRIBUTION_MAP,
            id,
            metric,
            test_get_errors!(metric)
        );
    } else {
        err = test_get_errors_with_method!(
            metric_maps,
            labeled_custom_distribution_test_get_num_recorded_errors,
            id
        );
    }
    err.map(|err_str| error_str.assign(&err_str)).is_some()
}

#[no_mangle]
pub extern "C" fn fog_labeled_memory_distribution_get(id: u32, label: &nsACString) -> u32 {
    let label = &label.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            LABELED_MEMORY_DISTRIBUTION_MAP,
            id,
            metric,
            metric.get_submetric_id(label)
        )
    } else {
        metric_maps::labeled_submetric_id_get(id, label)
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_memory_distribution_enum_get(id: u32, label: u16) -> u32 {
    assert!(!is_jog_id(id), "No enum_get support for JOG");
    metric_maps::labeled_submetric_id_get(id, metric_maps::labeled_enum_to_str(id, label))
}

#[no_mangle]
pub extern "C" fn fog_labeled_memory_distribution_test_get_value(
    id: u32,
    ping_name: &nsACString,
    count: &mut u64,
    keys: &mut ThinVec<nsCString>,
    values: &mut ThinVec<FfiDistributionData>,
) {
    let val;
    if is_jog_id(id) {
        val = just_with_jog_metric!(
            LABELED_MEMORY_DISTRIBUTION_MAP,
            id,
            metric,
            test_get!(metric, ping_name)
        );
    } else {
        let ping_name = &ping_name.to_utf8();
        val = metric_maps::labeled_memory_distribution_test_get(id, ping_name).unwrap();
    }
    *count = val.len() as _;
    for (key, value) in val {
        keys.push(nsCString::from(key));
        values.push(FfiDistributionData::from(value));
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_memory_distribution_test_get_error(
    id: u32,
    error_str: &mut nsCString,
) -> bool {
    let err;
    if is_jog_id(id) {
        err = just_with_jog_metric!(
            LABELED_MEMORY_DISTRIBUTION_MAP,
            id,
            metric,
            test_get_errors!(metric)
        );
    } else {
        err = test_get_errors_with_method!(
            metric_maps,
            labeled_memory_distribution_test_get_num_recorded_errors,
            id
        );
    }
    err.map(|err_str| error_str.assign(&err_str)).is_some()
}

#[no_mangle]
pub extern "C" fn fog_labeled_string_get(id: u32, label: &nsACString) -> u32 {
    let label = &label.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            LABELED_STRING_MAP,
            id,
            metric,
            metric.get_submetric_id(label)
        )
    } else {
        metric_maps::labeled_submetric_id_get(id, label)
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_string_enum_get(id: u32, label: u16) -> u32 {
    assert!(!is_jog_id(id), "No enum_get support for JOG");
    metric_maps::labeled_submetric_id_get(id, metric_maps::labeled_enum_to_str(id, label))
}

#[no_mangle]
pub extern "C" fn fog_labeled_string_test_get_value(
    id: u32,
    ping_name: &nsACString,
    count: &mut u64,
    keys: &mut ThinVec<nsCString>,
    values: &mut ThinVec<nsCString>,
) {
    let val;
    if is_jog_id(id) {
        val = just_with_jog_metric!(LABELED_STRING_MAP, id, metric, test_get!(metric, ping_name));
    } else {
        let ping_name = &ping_name.to_utf8();
        val = metric_maps::labeled_string_test_get(id, ping_name).unwrap();
    }
    *count = val.len() as _;
    for (key, value) in val {
        keys.push(nsCString::from(key));
        values.push(nsCString::from(value));
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_string_test_get_error(id: u32, error_str: &mut nsCString) -> bool {
    let err;
    if is_jog_id(id) {
        err = just_with_jog_metric!(LABELED_STRING_MAP, id, metric, test_get_errors!(metric));
    } else {
        err = test_get_errors_with_method!(
            metric_maps,
            labeled_string_test_get_num_recorded_errors,
            id
        );
    }
    err.map(|err_str| error_str.assign(&err_str)).is_some()
}

#[no_mangle]
pub extern "C" fn fog_labeled_timing_distribution_get(id: u32, label: &nsACString) -> u32 {
    let label = &label.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            LABELED_TIMING_DISTRIBUTION_MAP,
            id,
            metric,
            metric.get_submetric_id(label)
        )
    } else {
        metric_maps::labeled_submetric_id_get(id, label)
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_timing_distribution_enum_get(id: u32, label: u16) -> u32 {
    assert!(!is_jog_id(id), "No enum_get support for JOG");
    metric_maps::labeled_submetric_id_get(id, metric_maps::labeled_enum_to_str(id, label))
}

#[no_mangle]
pub extern "C" fn fog_labeled_timing_distribution_test_get_value(
    id: u32,
    ping_name: &nsACString,
    count: &mut u64,
    keys: &mut ThinVec<nsCString>,
    values: &mut ThinVec<FfiDistributionData>,
) {
    let val;
    if is_jog_id(id) {
        val = just_with_jog_metric!(
            LABELED_TIMING_DISTRIBUTION_MAP,
            id,
            metric,
            test_get!(metric, ping_name)
        );
    } else {
        let ping_name = &ping_name.to_utf8();
        val = metric_maps::labeled_timing_distribution_test_get(id, ping_name).unwrap();
    }
    *count = val.len() as _;
    for (key, value) in val {
        keys.push(nsCString::from(key));
        values.push(FfiDistributionData::from(value));
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_timing_distribution_test_get_error(
    id: u32,
    error_str: &mut nsCString,
) -> bool {
    let err;
    if is_jog_id(id) {
        err = just_with_jog_metric!(
            LABELED_TIMING_DISTRIBUTION_MAP,
            id,
            metric,
            test_get_errors!(metric)
        );
    } else {
        err = test_get_errors_with_method!(
            metric_maps,
            labeled_timing_distribution_test_get_num_recorded_errors,
            id
        );
    }
    err.map(|err_str| error_str.assign(&err_str)).is_some()
}

#[no_mangle]
pub extern "C" fn fog_labeled_quantity_get(id: u32, label: &nsACString) -> u32 {
    let label = &label.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            LABELED_QUANTITY_MAP,
            id,
            metric,
            metric.get_submetric_id(label)
        )
    } else {
        metric_maps::labeled_submetric_id_get(id, label)
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_quantity_enum_get(id: u32, label: u16) -> u32 {
    assert!(!is_jog_id(id), "No enum_get support for JOG");
    metric_maps::labeled_submetric_id_get(id, metric_maps::labeled_enum_to_str(id, label))
}

#[no_mangle]
pub extern "C" fn fog_labeled_quantity_test_get_value(
    id: u32,
    ping_name: &nsACString,
    count: &mut u64,
    keys: &mut ThinVec<nsCString>,
    values: &mut ThinVec<i64>,
) {
    let val;
    if is_jog_id(id) {
        val = just_with_jog_metric!(
            LABELED_QUANTITY_MAP,
            id,
            metric,
            test_get!(metric, ping_name)
        );
    } else {
        let ping_name = &ping_name.to_utf8();
        val = metric_maps::labeled_quantity_test_get(id, ping_name).unwrap();
    }
    *count = val.len() as _;
    for (key, value) in val {
        keys.push(nsCString::from(key));
        values.push(value as _);
    }
}

#[no_mangle]
pub extern "C" fn fog_labeled_quantity_test_get_error(id: u32, error_str: &mut nsCString) -> bool {
    let err;
    if is_jog_id(id) {
        err = just_with_jog_metric!(LABELED_QUANTITY_MAP, id, metric, test_get_errors!(metric));
    } else {
        err = test_get_errors_with_method!(
            metric_maps,
            labeled_quantity_test_get_num_recorded_errors,
            id
        );
    }
    err.map(|err_str| error_str.assign(&err_str)).is_some()
}

#[no_mangle]
pub extern "C" fn fog_dual_labeled_counter_get(
    id: u32,
    key: &nsACString,
    category: &nsACString,
) -> u32 {
    let key = &key.to_utf8();
    let category = &category.to_utf8();
    if is_jog_id(id) {
        just_with_jog_metric!(
            DUAL_LABELED_COUNTER_MAP,
            id,
            metric,
            metric.get_submetric_id(key, category)
        )
    } else {
        metric_maps::dual_labeled_submetric_id_get(id, key, category)
    }
}
