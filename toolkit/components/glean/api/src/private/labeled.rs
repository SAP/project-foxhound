// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

use inherent::inherent;

use super::{
    ErrorType, LabeledBooleanMetric, LabeledCounterMetric, LabeledCustomDistributionMetric,
    LabeledMemoryDistributionMetric, LabeledMetricData, LabeledStringMetric,
    LabeledTimingDistributionMetric, MetricId,
};
use crate::ipc::need_ipc;
use std::borrow::Cow;
use std::marker::PhantomData;

/// Sealed traits protect against downstream implementations.
///
/// We wrap it in a private module that is inaccessible outside of this module.
mod private {
    use super::{
        need_ipc, LabeledBooleanMetric, LabeledCounterMetric, LabeledCustomDistributionMetric,
        LabeledMemoryDistributionMetric, LabeledStringMetric, LabeledTimingDistributionMetric,
        MetricId,
    };
    use crate::private::labeled_timing_distribution::LabeledTimingDistributionMetricKind;
    use crate::private::{
        CounterMetric, CustomDistributionMetric, MemoryDistributionMetric, TimingDistributionMetric,
    };
    use std::sync::Arc;

    /// The sealed trait.
    ///
    /// This allows us to define which FOG metrics can be used
    /// as labeled types.
    pub trait Sealed {
        type GleanMetric: glean::private::AllowLabeled + Clone;
        fn from_glean_metric(id: MetricId, metric: Arc<Self::GleanMetric>, label: &str) -> Self;
    }

    // `LabeledMetric<LabeledBooleanMetric>` is possible.
    //
    // See [Labeled Booleans](https://mozilla.github.io/glean/book/user/metrics/labeled_booleans.html).
    impl Sealed for LabeledBooleanMetric {
        type GleanMetric = glean::private::BooleanMetric;
        fn from_glean_metric(_id: MetricId, metric: Arc<Self::GleanMetric>, _label: &str) -> Self {
            if need_ipc() {
                // TODO: Instrument this error.
                LabeledBooleanMetric::Child(crate::private::boolean::BooleanMetricIpc)
            } else {
                LabeledBooleanMetric::Parent(metric)
            }
        }
    }

    // `LabeledMetric<LabeledStringMetric>` is possible.
    //
    // See [Labeled Strings](https://mozilla.github.io/glean/book/user/metrics/labeled_strings.html).
    impl Sealed for LabeledStringMetric {
        type GleanMetric = glean::private::StringMetric;
        fn from_glean_metric(_id: MetricId, metric: Arc<Self::GleanMetric>, _label: &str) -> Self {
            if need_ipc() {
                // TODO: Instrument this error.
                LabeledStringMetric::Child(crate::private::string::StringMetricIpc)
            } else {
                LabeledStringMetric::Parent(metric)
            }
        }
    }

    // `LabeledMetric<LabeledCounterMetric>` is possible.
    //
    // See [Labeled Counters](https://mozilla.github.io/glean/book/user/metrics/labeled_counters.html).
    impl Sealed for LabeledCounterMetric {
        type GleanMetric = glean::private::CounterMetric;
        fn from_glean_metric(id: MetricId, metric: Arc<Self::GleanMetric>, label: &str) -> Self {
            if need_ipc() {
                LabeledCounterMetric::Child {
                    id,
                    label: label.to_string(),
                }
            } else {
                LabeledCounterMetric::Parent(CounterMetric::Parent { id, inner: metric })
            }
        }
    }

    // `LabeledMetric<LabeledCustomDistributionMetric>` is possible.
    //
    // See [Labeled Custom Distributions](https://mozilla.github.io/glean/book/user/metrics/labeled_custom_distributions.html).
    impl Sealed for LabeledCustomDistributionMetric {
        type GleanMetric = glean::private::CustomDistributionMetric;
        fn from_glean_metric(id: MetricId, metric: Arc<Self::GleanMetric>, label: &str) -> Self {
            if need_ipc() {
                LabeledCustomDistributionMetric::Child {
                    id,
                    label: label.to_string(),
                }
            } else {
                LabeledCustomDistributionMetric::Parent(CustomDistributionMetric::Parent {
                    id,
                    inner: metric,
                })
            }
        }
    }

    // `LabeledMetric<LabeledMemoryDistributionMetric>` is possible.
    //
    // See [Labeled Memory Distributions](https://mozilla.github.io/glean/book/user/metrics/labeled_memory_distributions.html).
    impl Sealed for LabeledMemoryDistributionMetric {
        type GleanMetric = glean::private::MemoryDistributionMetric;
        fn from_glean_metric(id: MetricId, metric: Arc<Self::GleanMetric>, label: &str) -> Self {
            if need_ipc() {
                LabeledMemoryDistributionMetric::Child {
                    id,
                    label: label.to_string(),
                }
            } else {
                LabeledMemoryDistributionMetric::Parent(MemoryDistributionMetric::Parent {
                    id,
                    inner: metric,
                })
            }
        }
    }

    // `LabeledMetric<LabeledTimingDistributionMetric>` is possible.
    //
    // See [Labeled Timing Distributions](https://mozilla.github.io/glean/book/user/metrics/labeled_timing_distributions.html).
    impl Sealed for LabeledTimingDistributionMetric {
        type GleanMetric = glean::private::TimingDistributionMetric;
        fn from_glean_metric(id: MetricId, metric: Arc<Self::GleanMetric>, label: &str) -> Self {
            if need_ipc() {
                LabeledTimingDistributionMetric {
                    inner: Arc::new(TimingDistributionMetric::new_child(id)),
                    id,
                    label: label.to_string(),
                    kind: LabeledTimingDistributionMetricKind::Child,
                }
            } else {
                LabeledTimingDistributionMetric {
                    inner: Arc::new(TimingDistributionMetric::Parent { id, inner: metric }),
                    id,
                    label: label.to_string(),
                    kind: LabeledTimingDistributionMetricKind::Parent,
                }
            }
        }
    }
}

/// Marker trait for metrics that can be nested inside a labeled metric.
///
/// This trait is sealed and cannot be implemented for types outside this crate.
pub trait AllowLabeled: private::Sealed {}

// Implement the trait for everything we marked as allowed.
impl<T> AllowLabeled for T where T: private::Sealed {}

/// A labeled metric.
///
/// Labeled metrics allow to record multiple sub-metrics of the same type under different string labels.
///
/// ## Example
///
/// The following piece of code will be generated by `glean_parser`:
///
/// ```rust,ignore
/// use glean::metrics::{LabeledMetric, BooleanMetric, CommonMetricData, LabeledMetricData, Lifetime};
/// use once_cell::sync::Lazy;
///
/// mod error {
///     pub static seen_one: Lazy<LabeledMetric<BooleanMetric, DynamicLabel>> = Lazy::new(|| LabeledMetric::new(LabeledMetricData::Common{ cmd: CommonMetricData {
///         name: "seen_one".into(),
///         category: "error".into(),
///         send_in_pings: vec!["ping".into()],
///         disabled: false,
///         lifetime: Lifetime::Ping,
///         ..Default::default()
///     }}, None));
/// }
/// ```
///
/// It can then be used with:
///
/// ```rust,ignore
/// errro::seen_one.get("upload").set(true);
/// ```
pub struct LabeledMetric<T: AllowLabeled, E> {
    /// The metric ID of the underlying metric.
    id: MetricId,

    /// Wrapping the underlying core metric.
    ///
    /// We delegate all functionality to this and wrap it up again in our own metric type.
    core: glean::private::LabeledMetric<T::GleanMetric>,

    label_enum: PhantomData<E>,
}

impl<T, E> LabeledMetric<T, E>
where
    T: AllowLabeled,
{
    /// Create a new labeled metric from the given metric instance and optional list of labels.
    ///
    /// See [`get`](#method.get) for information on how static or dynamic labels are handled.
    pub fn new(
        id: MetricId,
        meta: LabeledMetricData,
        labels: Option<Vec<Cow<'static, str>>>,
    ) -> LabeledMetric<T, E> {
        let core = glean::private::LabeledMetric::new(meta, labels);
        LabeledMetric {
            id,
            core,
            label_enum: PhantomData,
        }
    }
}

#[inherent]
impl<U, E> glean::traits::Labeled<U> for LabeledMetric<U, E>
where
    U: AllowLabeled + Clone,
{
    /// Gets a specific metric for a given label.
    ///
    /// If a set of acceptable labels were specified in the `metrics.yaml` file,
    /// and the given label is not in the set, it will be recorded under the special `OTHER_LABEL` label.
    ///
    /// If a set of acceptable labels was not specified in the `metrics.yaml` file,
    /// only the first 16 unique labels will be used.
    /// After that, any additional labels will be recorded under the special `OTHER_LABEL` label.
    ///
    /// Labels must be `snake_case` and less than 30 characters.
    /// If an invalid label is used, the metric will be recorded in the special `OTHER_LABEL` label.
    pub fn get(&self, label: &str) -> U {
        let metric = self.core.get(label);
        U::from_glean_metric(self.id, metric, label)
    }

    /// **Exported for test purposes.**
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
    pub fn test_get_num_recorded_errors(&self, error: ErrorType) -> i32 {
        if need_ipc() {
            panic!("Use of labeled metrics in IPC land not yet implemented!");
        } else {
            self.core.test_get_num_recorded_errors(error)
        }
    }
}

#[cfg(test)]
mod test {
    use once_cell::sync::Lazy;

    use super::*;
    use crate::common_test::*;
    use crate::metrics::DynamicLabel;
    use crate::private::CommonMetricData;

    // Smoke test for what should be the generated code.
    static GLOBAL_METRIC: Lazy<LabeledMetric<LabeledBooleanMetric, DynamicLabel>> =
        Lazy::new(|| {
            LabeledMetric::new(
                0.into(),
                LabeledMetricData::Common {
                    cmd: CommonMetricData {
                        name: "global".into(),
                        category: "metric".into(),
                        send_in_pings: vec!["ping".into()],
                        disabled: false,
                        ..Default::default()
                    },
                },
                None,
            )
        });

    #[test]
    fn smoke_test_global_metric() {
        let _lock = lock_test();

        GLOBAL_METRIC.get("a_value").set(true);
        assert_eq!(
            true,
            GLOBAL_METRIC.get("a_value").test_get_value("ping").unwrap()
        );
    }

    #[test]
    fn sets_labeled_bool_metrics() {
        let _lock = lock_test();
        let store_names: Vec<String> = vec!["store1".into()];

        let metric: LabeledMetric<LabeledBooleanMetric, DynamicLabel> = LabeledMetric::new(
            0.into(),
            LabeledMetricData::Common {
                cmd: CommonMetricData {
                    name: "bool".into(),
                    category: "labeled".into(),
                    send_in_pings: store_names,
                    disabled: false,
                    ..Default::default()
                },
            },
            None,
        );

        metric.get("upload").set(true);

        assert!(metric.get("upload").test_get_value("store1").unwrap());
        assert_eq!(None, metric.get("download").test_get_value("store1"));
    }

    #[test]
    fn sets_labeled_string_metrics() {
        let _lock = lock_test();
        let store_names: Vec<String> = vec!["store1".into()];

        let metric: LabeledMetric<LabeledStringMetric, DynamicLabel> = LabeledMetric::new(
            0.into(),
            LabeledMetricData::Common {
                cmd: CommonMetricData {
                    name: "string".into(),
                    category: "labeled".into(),
                    send_in_pings: store_names,
                    disabled: false,
                    ..Default::default()
                },
            },
            None,
        );

        metric.get("upload").set("Glean");

        assert_eq!(
            "Glean",
            metric.get("upload").test_get_value("store1").unwrap()
        );
        assert_eq!(None, metric.get("download").test_get_value("store1"));
    }

    #[test]
    fn sets_labeled_counter_metrics() {
        let _lock = lock_test();
        let store_names: Vec<String> = vec!["store1".into()];

        let metric: LabeledMetric<LabeledCounterMetric, DynamicLabel> = LabeledMetric::new(
            0.into(),
            LabeledMetricData::Common {
                cmd: CommonMetricData {
                    name: "counter".into(),
                    category: "labeled".into(),
                    send_in_pings: store_names,
                    disabled: false,
                    ..Default::default()
                },
            },
            None,
        );

        metric.get("upload").add(10);

        assert_eq!(10, metric.get("upload").test_get_value("store1").unwrap());
        assert_eq!(None, metric.get("download").test_get_value("store1"));
    }

    #[test]
    fn records_errors() {
        let _lock = lock_test();
        let store_names: Vec<String> = vec!["store1".into()];

        let metric: LabeledMetric<LabeledBooleanMetric, DynamicLabel> = LabeledMetric::new(
            0.into(),
            LabeledMetricData::Common {
                cmd: CommonMetricData {
                    name: "bool".into(),
                    category: "labeled".into(),
                    send_in_pings: store_names,
                    disabled: false,
                    ..Default::default()
                },
            },
            None,
        );

        metric.get(&"1".repeat(72)).set(true);

        assert_eq!(
            1,
            metric.test_get_num_recorded_errors(ErrorType::InvalidLabel)
        );
    }

    #[test]
    fn predefined_labels() {
        let _lock = lock_test();
        let store_names: Vec<String> = vec!["store1".into()];

        #[allow(dead_code)]
        enum MetricLabels {
            Label1 = 0,
            Label2 = 1,
        }
        let metric: LabeledMetric<LabeledBooleanMetric, MetricLabels> = LabeledMetric::new(
            0.into(),
            LabeledMetricData::Common {
                cmd: CommonMetricData {
                    name: "bool".into(),
                    category: "labeled".into(),
                    send_in_pings: store_names,
                    disabled: false,
                    ..Default::default()
                },
            },
            Some(vec!["label1".into(), "label2".into()]),
        );

        metric.get("label1").set(true);
        metric.get("label2").set(false);
        metric.get("not_a_label").set(true);

        assert_eq!(true, metric.get("label1").test_get_value("store1").unwrap());
        assert_eq!(
            false,
            metric.get("label2").test_get_value("store1").unwrap()
        );
        // The label not in the predefined set is recorded to the `other` bucket.
        assert_eq!(
            true,
            metric.get("__other__").test_get_value("store1").unwrap()
        );

        assert_eq!(
            0,
            metric.test_get_num_recorded_errors(ErrorType::InvalidLabel)
        );
    }
}
