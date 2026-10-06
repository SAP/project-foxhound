// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

use inherent::inherent;
use std::sync::Arc;

use glean::{traits::Quantity, MetricIdentifier};

use super::{BaseMetricId, ChildMetricMeta, CommonMetricData, MetricId, MetricNamer};

use crate::ipc::{need_ipc, with_ipc_payload};

/// A quantity metric.
///
/// Records a single numeric value of a specific unit.
#[derive(Clone)]
pub enum QuantityMetric {
    Parent {
        /// The metric's ID. Used for testing and profiler markers. Quantity
        /// metrics can be labeled, so we may have either a metric ID or
        /// sub-metric ID.
        id: MetricId,
        inner: Arc<glean::private::QuantityMetric>,
    },
    Child(ChildMetricMeta),
    UnorderedChild(ChildMetricMeta),
}

define_metric_metadata_getter!(QuantityMetric, QUANTITY_MAP, LABELED_QUANTITY_MAP);

impl MetricNamer for QuantityMetric {
    fn get_metadata(&self) -> crate::private::MetricMetadata {
        crate::private::MetricMetadata::from_triple(match self {
            QuantityMetric::Parent { inner, .. } => inner.get_identifiers(),
            QuantityMetric::Child(meta) => meta.get_identifiers(),
            QuantityMetric::UnorderedChild(meta) => meta.get_identifiers(),
        })
    }
}

impl QuantityMetric {
    /// Create a new quantity metric.
    pub fn new(id: BaseMetricId, meta: CommonMetricData) -> Self {
        if need_ipc() {
            QuantityMetric::Child(ChildMetricMeta::from_common_metric_data(id, meta))
        } else {
            QuantityMetric::Parent {
                id: id.into(),
                inner: Arc::new(glean::private::QuantityMetric::new(meta)),
            }
        }
    }

    pub fn with_unordered_ipc(id: BaseMetricId, meta: CommonMetricData) -> Self {
        if need_ipc() {
            QuantityMetric::UnorderedChild(ChildMetricMeta::from_common_metric_data(id, meta))
        } else {
            Self::new(id, meta)
        }
    }

    #[cfg(test)]
    pub(crate) fn child_metric(&self) -> Self {
        match self {
            QuantityMetric::Parent { id, inner } => {
                // SAFETY: We can unwrap here, as this code is only run in the
                // context of a test. If this code is used elsewhere, the
                // `unwrap` should be replaced with proper error handling of
                // the `None` case.
                QuantityMetric::Child(ChildMetricMeta::from_metric_identifier(
                    id.base_metric_id().unwrap(),
                    inner.as_ref(),
                ))
            }
            _ => panic!("Can't get a child metric from a child metric"),
        }
    }
}

#[inherent]
impl Quantity for QuantityMetric {
    /// Set the value. Must be non-negative.
    ///
    /// # Arguments
    ///
    /// * `value` - The value. Must be non-negative.
    ///
    /// ## Notes
    ///
    /// Logs an error if the `value` is negative.
    pub fn set(&self, value: i64) {
        match self {
            #[allow(unused)]
            QuantityMetric::Parent { id, inner } => {
                #[cfg(feature = "with_gecko")]
                if gecko_profiler::current_thread_is_being_profiled_for_markers() {
                    gecko_profiler::add_marker(
                        "Quantity::set",
                        super::profiler_utils::TelemetryProfilerCategory,
                        Default::default(),
                        super::profiler_utils::IntLikeMetricMarker::<QuantityMetric, i64>::new(
                            *id, None, value,
                        ),
                    );
                }
                inner.set(value);
            }
            QuantityMetric::Child(_) => {
                log::error!("Unable to set quantity metric in non-main process. This operation will be ignored.");
                // If we're in automation we can panic so the instrumentor knows they've gone wrong.
                // This is a deliberate violation of Glean's "metric APIs must not throw" design.
                assert!(!crate::ipc::is_in_automation(), "Attempted to set quantity metric in non-main process, which is forbidden. This panics in automation.");
                // TODO: Record an error.
            }
            QuantityMetric::UnorderedChild(meta) => {
                #[cfg(feature = "with_gecko")]
                gecko_profiler::add_marker(
                    "Quantity::set",
                    super::profiler_utils::TelemetryProfilerCategory,
                    Default::default(),
                    super::profiler_utils::IntLikeMetricMarker::<QuantityMetric, i64>::new(
                        meta.id.into(),
                        None,
                        value,
                    ),
                );
                with_ipc_payload(move |payload| {
                    if let Some(v) = payload.quantities.get_mut(&meta.id) {
                        *v = value;
                    } else {
                        payload.quantities.insert(meta.id, value);
                    }
                });
            }
        }
    }

    /// **Test-only API.**
    ///
    /// Gets the number of recorded errors for the given metric and error type.
    ///
    /// # Arguments
    ///
    /// * `error` - The type of error
    /// * `ping_name` - represents the optional name of the ping to retrieve the
    ///   metric for. Defaults to the first value in `send_in_pings`.
    ///
    /// # Returns
    ///
    /// The number of errors reported.
    pub fn test_get_num_recorded_errors(&self, error: glean::ErrorType) -> i32 {
        match self {
            QuantityMetric::Parent { inner, .. } => inner.test_get_num_recorded_errors(error),
            _ => panic!(
                "Cannot get the number of recorded errors for quantity metric in non-main process!"
            ),
        }
    }
}

#[inherent]
impl glean::TestGetValue for QuantityMetric {
    type Output = i64;

    /// **Test-only API.**
    ///
    /// Get the currently stored value.
    /// This doesn't clear the stored value.
    ///
    /// ## Arguments
    ///
    /// * `ping_name` - the storage name to look into.
    ///
    /// ## Return value
    ///
    /// Returns the stored value or `None` if nothing stored.
    pub fn test_get_value(&self, ping_name: Option<String>) -> Option<i64> {
        match self {
            QuantityMetric::Parent { inner, .. } => inner.test_get_value(ping_name),
            _ => {
                panic!("Cannot get test value for quantity metric in non-main process!",)
            }
        }
    }
}

#[cfg(test)]
mod test {
    use crate::{common_test::*, ipc, metrics};

    #[test]
    fn sets_quantity_metric() {
        let _lock = lock_test();

        let metric = &metrics::test_only_ipc::a_quantity;
        metric.set(14);

        assert_eq!(
            14,
            metric
                .test_get_value(Some("test-ping".to_string()))
                .unwrap()
        );
    }

    #[test]
    fn quantity_no_ipc() {
        // QuantityMetric doesn't support IPC.
        let _lock = lock_test();

        let parent_metric = &metrics::test_only_ipc::a_quantity;

        parent_metric.set(15);

        {
            let child_metric = parent_metric.child_metric();

            // scope for need_ipc RAII
            let _raii = ipc::test_set_need_ipc(true);

            // Instrumentation calls do not panic.
            child_metric.set(30);

            // (They also shouldn't do anything,
            // but that's not something we can inspect in this test)
        }

        assert!(ipc::replay_from_buf(&ipc::take_buf().unwrap()).is_ok());

        assert_eq!(15, parent_metric.test_get_value(None).unwrap());
    }

    #[test]
    fn quantity_unordered_ipc() {
        // QuantityMetric::UnorderedChild _does_ support IPC.
        let _lock = lock_test();

        let parent_metric = &metrics::test_only_ipc::an_unordered_quantity;

        parent_metric.set(42);

        if let super::QuantityMetric::Child(meta) = parent_metric.child_metric() {
            let _raii = ipc::test_set_need_ipc(true);
            super::QuantityMetric::UnorderedChild(meta).set(24);
        } else {
            panic!("Not an ordered child!");
        }

        assert!(ipc::replay_from_buf(&ipc::take_buf().unwrap()).is_ok());

        assert_eq!(
            24,
            parent_metric.test_get_value(None).unwrap(),
            "Quantity metrics can unsafely work in child processes"
        );
    }
}
