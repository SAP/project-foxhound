/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEngine } from "chrome://global/content/ml/EngineProcess.sys.mjs";
import {
  cosSim,
  KeywordExtractor,
} from "chrome://global/content/ml/NLPUtils.sys.mjs";

import {
  kmeansPlusPlus,
  computeCentroidFrom2DArray,
  euclideanDistance,
  silhouetteCoefficients,
  getAccuracyStats,
  computeRandScore,
} from "chrome://global/content/ml/ClusterAlgos.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  NLP: "resource://gre/modules/NLP.sys.mjs",
});

const EMBED_TEXT_KEY = "combined_text";
export const CLUSTER_METHODS = {
  KMEANS: "KMEANS",
};

// Methods for finding similar items for an existing cluster
export const ANCHOR_METHODS = {
  DRIFT: "DRIFT", // We let k-means clustering run, and find the cluster with the most anchor items
  FIXED: "FIXED", // We always group with the anchor items in the 0 cluster, and never let them be reassinged
};

// Methods for finding ignoring other groups that were already grouped
export const PREGROUPED_HANDLING_METHODS = {
  EXCLUDE: "EXCLUDE", // We let k-means clustering run, and find the cluster with the most anchor items
  IGNORE: "IGNORE", // We always group with the anchor items in the 0 cluster, and never let them be reassinged
};

// Methods for suggesting tabs that are similar to current tab
export const SUGGEST_OTHER_TABS_METHODS = {
  KMEANS_WITH_ANCHOR: "KMEANS_WITH_ANCHOR",
  NEAREST_NEIGHBOR: "NEAREST_NEIGHBOR",
};

export const DIM_REDUCTION_METHODS = {};
const MISSING_ANCHOR_IN_CLUSTER_PENALTY = 0.2;
const NEAREST_NEIGHBOR_DEFAULT_THRESHOLD = 0.225;
const DISSIMILAR_TAB_LABEL = "None";
const MAX_NN_GROUPED_TABS = 4;

const ML_TASK_FEATURE_EXTRACTION = "feature-extraction";
const ML_TASK_TEXT2TEXT = "text2text-generation";

const ML_SMART_TAB_EMBEDDING_ENGINE_ID = "smart-tab-embedding-engine";
const ML_SMART_TAB_TOPIC_ENGINE_ID = "smart-tab-topic-engine";

const SMART_TAB_GROUPING_CONFIG = {
  embedding: {
    engineId: ML_SMART_TAB_EMBEDDING_ENGINE_ID,
    dtype: "q8",
    timeoutMS: 2 * 60 * 1000, // 2 minutes
    taskName: ML_TASK_FEATURE_EXTRACTION,
  },
  topicGeneration: {
    engineId: ML_SMART_TAB_TOPIC_ENGINE_ID,
    dtype: "q8",
    timeoutMS: 2 * 60 * 1000, // 2 minutes
    taskName: ML_TASK_TEXT2TEXT,
  },
  dataConfig: {
    titleKey: "label",
    descriptionKey: "description",
  },
  clustering: {
    dimReductionMethod: null, // Not completed.
    clusterImplementation: CLUSTER_METHODS.KMEANS,
    clusteringTriesPerK: 3,
    anchorMethod: ANCHOR_METHODS.FIXED,
    pregroupedHandlingMethod: PREGROUPED_HANDLING_METHODS.EXCLUDE,
    pregroupedSilhouetteBoost: 2, // Relative weight of the cluster's score and all other cluster's combined
    suggestOtherTabsMethod: SUGGEST_OTHER_TABS_METHODS.NEAREST_NEIGHBOR,
  },
};

/**
 * For a given set of clusters represented by indices, returns the index of the cluster
 * that has the most anchor items inside it.
 *
 * An anhor item is an index that represents the index to a tab that is already grouped and in
 * the cluster we're interested in finding more items for.
 *
 * @param {number[][]} groupIndices - Array of clusters represented as arrays of indices.
 * @param {number[]} anchorItems - Array of anchor item indices.
 * @returns {{anchorClusterIndex: number, numAnchorItemsInCluster: number}} Index of best cluster and the number of anchor items.
 */
export function getBestAnchorClusterInfo(groupIndices, anchorItems) {
  const anchorItemSet = new Set(anchorItems);
  const numItemsList = groupIndices.map(g =>
    g.reduce(
      (cur, itemIndex) => (anchorItemSet.has(itemIndex) ? cur + 1 : cur),
      0
    )
  );
  const anchorClusterIndex = numItemsList.indexOf(Math.max(...numItemsList));
  const numAnchorItemsInCluster = numItemsList[anchorClusterIndex];
  return { anchorClusterIndex, numAnchorItemsInCluster };
}

export class SmartTabGroupingManager {
  /**
   * Creates the SmartTabGroupingManager object.
   * @param {object} config configuration options
   */
  constructor(config) {
    this.config = config || SMART_TAB_GROUPING_CONFIG;
  }

  /**
   * Generates suggested tabs for an existing or provisional group
   * @param {object} group active group we are adding tabs to
   * @param {array} tabs list of tabs from gbrowser, some of which may be grouped in other groups
   * @returns a list of suggested new tabs. If no new tabs are suggested an empty list is returned.
   */
  async smartTabGroupingForGroup(group, tabs) {
    // Add tabs to suggested group
    const groupTabs = group.tabs;

    const uniqueSpecs = new Set();
    const allTabs = tabs.filter(tab => {
      // Don't include tabs already pinned
      if (tab.pinned) {
        return false;
      }

      const spec = tab?.linkedBrowser?.currentURI?.spec;
      if (!spec) {
        return false;
      }
      if (!uniqueSpecs.has(spec)) {
        uniqueSpecs.add(spec);
        return true;
      }

      return false;
    });

    // find tabs that are part of the group
    const groupIndices = groupTabs
      .map(a => allTabs.indexOf(a))
      .filter(a => a >= 0);

    // find tabs that are part of other groups
    const alreadyGroupedIndices = allTabs
      .map((t, i) => (t.group ? i : -1))
      .filter(a => a >= 0);

    let suggestedTabs;
    switch (this.config.suggestOtherTabsMethod) {
      case SUGGEST_OTHER_TABS_METHODS.KMEANS_WITH_ANCHOR:
        suggestedTabs = await this.generateClusters(
          allTabs,
          null,
          null,
          null,
          groupIndices,
          alreadyGroupedIndices
        ).then(clusters => {
          if (!clusters) {
            return [];
          }
          const targetCluster = clusters.clusterRepresentations.find(c =>
            groupTabs.some(g => c.tabs.includes(g))
          );
          if (targetCluster) {
            // Return only tabs not already grouped
            return targetCluster.tabs.filter(t => !t.group);
          }
          return [];
        });
        break;
      case SUGGEST_OTHER_TABS_METHODS.NEAREST_NEIGHBOR:
      default:
        // find nearest neighbors to current group
        suggestedTabs = await this.findNearestNeighbors(
          allTabs,
          groupIndices,
          alreadyGroupedIndices
        );
    }
    return suggestedTabs;
  }

  /*
   * Generates similar tabs a grouped list of tabs
   * @param {array} allTabs all tabs that are part of the window
   * @param {array} groupedIndices indices of tabs that are already part of the group
   * @param {array} alreadyGroupedIndices indices of tabs that are part of other groups
   * @param {number} threshold for nearest neighbor similarity
   * @returns a list of suggested tabs that are similar to the groupedIndices tabs
   */
  async findNearestNeighbors(
    allTabs,
    groupedIndices,
    alreadyGroupedIndices,
    threshold = NEAREST_NEIGHBOR_DEFAULT_THRESHOLD
  ) {
    // get tabs in group first
    const tabsInGroup = groupedIndices.map(i => allTabs[i]);
    const tabsInGroupData = await this._prepareTabData(tabsInGroup);
    const tabsInGroupEmbeddings = await this._generateEmbeddings(
      tabsInGroupData.map(a => a[EMBED_TEXT_KEY])
    );

    // get tabs that we need to assign
    const groupedTabIndices = groupedIndices.concat(alreadyGroupedIndices);
    const tabsToAssign = allTabs.filter(
      (_, index) => !groupedTabIndices.includes(index)
    );
    const tabsToAssignData = await this._prepareTabData(tabsToAssign);
    const tabsToAssignEmbeddings = await this._generateEmbeddings(
      tabsToAssignData.map(a => a[EMBED_TEXT_KEY])
    );

    // find closest tabs
    // if any tab is close to a tab in the existing group, add to list
    const closestTabs = [];

    // select MAX_NN_GROUPED_TABS so too many tabs in same group won't cause performance issues
    for (let i = 0; i < tabsToAssign.length; i++) {
      let closestScore = null;
      for (
        let j = 0;
        j < Math.min(tabsInGroup.length, MAX_NN_GROUPED_TABS);
        j++
      ) {
        const cosineSim = cosSim(
          tabsToAssignEmbeddings[i],
          tabsInGroupEmbeddings[j]
        );
        if (!closestScore || cosineSim > closestScore) {
          closestScore = cosineSim;
        }
      }
      if (closestScore > threshold) {
        closestTabs.push([tabsToAssign[i], closestScore]);
      }
    }
    // sort and return by tabs that are most similar
    closestTabs.sort((a, b) => b[1] - a[1]);
    return closestTabs.map(t => t[0]);
  }

  /**
   * This function will terminate a grouping or label generation in progress
   * It is currently not implemented.
   */
  terminateProcess() {
    // TODO - teminate AI processes, This method will be
    // called when tab grouping panel is closed.
  }

  /**
   * Changes the clustering method. Must be one of supported methods.
   * @param {string} method Name of method
   */
  setClusteringMethod(method) {
    if (!(method in CLUSTER_METHODS)) {
      throw new Error(`Clustering method ${method} not supported`);
    }
    this.config.clustering.clusterImplementation = method;
  }

  /**
   * Set the technique for clustering when certain tabs are already assigned to groups
   *
   * @param {string} method which is one of ANCHOR_METHODS
   */
  setAnchorMethod(method) {
    if (!(method in ANCHOR_METHODS)) {
      throw new Error(`Clustering anchor method ${method} not supported`);
    }
    this.config.clustering.anchorMethod = method;
  }

  setSilBoost(boost) {
    this.config.clustering.pregroupedSilhouetteBoost = boost;
  }

  /**
   * Sets method to reduce dimensionality of embeddings prior to clustering
   * @param {string} method Name of method
   */
  setDimensionReductionMethod(method) {
    if (method && !(method in DIM_REDUCTION_METHODS)) {
      throw new Error(`Dimension reduction method ${method} not supported`);
    }
    this.config.clustering.dimReductionMethod = method;
  }

  /**
   * Sets the field name of the title of a page to be used when clustering or generating embeddings
   * This is useful when clustering test data that is not a tab object
   * @param {string} titleKey KEY FOR THE TITLE
   */
  setDataTitleKey(titleKey) {
    this.config.dataConfig.titleKey = titleKey;
  }

  /**
   * Logs to the appropriate place for debugging. Console for now
   * @param {string} msg Message to log
   */
  log(_msg) {}

  async _prepareTabData(tabList) {
    const titleKey = this.config.dataConfig.titleKey;
    const descriptionKey = this.config.dataConfig.descriptionKey;
    const structuredData = [];
    for (let tab of tabList) {
      const description = descriptionKey && tab[descriptionKey];

      let textToEmbed;
      if (description) {
        textToEmbed = tab[titleKey] + " " + description;
      } else {
        textToEmbed = tab[titleKey] || "Unknown";
      }

      structuredData.push({
        [EMBED_TEXT_KEY]: textToEmbed,
        title: tab[titleKey],
        description,
        url: tab?.linkedBrowser?.currentURI?.spec,
      });
    }
    return structuredData;
  }

  /**
   * Creates an ML engine for a given config.
   * @param {*} engineConfig
   * @returns MLEngine
   */
  async _createMLEngine(engineConfig) {
    const {
      featureId,
      engineId,
      dtype,
      taskName,
      timeoutMS,
      modelId,
      modelRevision,
    } = engineConfig;
    let initData = {
      featureId,
      engineId,
      dtype,
      taskName,
      timeoutMS,
      modelId,
      modelRevision,
    };
    return await createEngine(initData);
  }

  /**
   * Generates embeddings from a list of tab data structures
   * @param  tabList List of tabs with label (title) and description keys
   * @returns {Promise<*[]>} List of embeddings (2d array)
   * @private
   */
  async _generateEmbeddings(textToEmbedList) {
    const inputData = {
      inputArgs: textToEmbedList,
      runOptions: {
        pooling: "mean",
        normalize: true,
      },
    };

    if (
      !this.embeddingEngine ||
      this.embeddingEngine?.engineStatus === "closed"
    ) {
      this.embeddingEngine = await this._createMLEngine(this.config.embedding);
    }
    const request = {
      args: [inputData.inputArgs],
      options: inputData.runOptions,
    };
    return await this.embeddingEngine.run(request);
  }

  /**
   * Clusters in desired methods
   * based on the config of the class
   * @param tabList List of tabs as array
   * @param docEmbeddings Precomputed embeddings for the Tab as two dimensional array
   * @param k Desired number of clusters. Tries a range of sizes if 0.
   * @param {function} randomFunc Optional seeded random number generator for testing
   * @returns {SmartTabGroupingResult}
   * @private
   */
  _clusterEmbeddings({
    tabs,
    embeddings,
    k,
    randomFunc,
    anchorIndices,
    alreadyGroupedIndices = [],
  }) {
    let allItems;

    const freezeAnchorsInZeroCluster =
      anchorIndices &&
      this.config.clustering.anchorMethod == ANCHOR_METHODS.FIXED;

    const dimReductionMethod = this.config.clustering.dimReductionMethod;
    switch (dimReductionMethod) {
      default:
        //  Dimensionality reduction support is landing very soon.
        break;
    }
    k = k || 0;
    let startK = k;
    let endK = k + 1;
    if (!k) {
      startK = 2;
      // Find a reasonable max # of clusters
      endK =
        Math.min(
          Math.floor(Math.log(embeddings.length) * 2.0),
          embeddings.length
        ) + 1;
    }
    let bestResult;
    let bestResultSilScore = -100.0;
    let bestResultCenterCluster = 0;

    const clusteringMethod = this.config.clustering.clusterImplementation;
    const clusteringTriesPerK = this.config.clustering.clusteringTriesPerK;
    for (let curK = startK; curK < endK; curK++) {
      let bestItemsForK;
      let bestInertiaForK = 500000000000;
      for (let j = 0; j < clusteringTriesPerK; j++) {
        switch (clusteringMethod) {
          case CLUSTER_METHODS.KMEANS:
            allItems = kmeansPlusPlus({
              data: embeddings,
              k: curK,
              maxIterations: 0,
              randomFunc,
              anchorIndices,
              preassignedIndices:
                this.config.clustering.pregroupedHandlingMethod ===
                PREGROUPED_HANDLING_METHODS.EXCLUDE
                  ? alreadyGroupedIndices
                  : [],
              freezeAnchorsInZeroCluster,
            });
            break;
          default:
            throw Error("Clustering implementation not supported");
        }
        const tempResult = new SmartTabGroupingResult({
          indices: allItems,
          embeddings,
          config: this.config,
        });
        const inertia = tempResult.getCentroidInertia();
        if (inertia < bestInertiaForK) {
          bestInertiaForK = inertia;
          bestItemsForK = tempResult;
        }
      }
      const silScores = silhouetteCoefficients(
        embeddings,
        bestItemsForK.indices
      );

      if (
        freezeAnchorsInZeroCluster &&
        this.config.clustering.pregroupedSilhouetteBoost > 0
      ) {
        // Boost silhouette score of target cluster when we are grouping around an existing cluster
        // pregroupedSilhouetteBoost indicates the relative weight of the cluster's score and all other cluster's combined
        silScores[0] *= this.config.clustering.pregroupedSilhouetteBoost;
      }

      let avgSil = silScores.reduce((p, c) => p + c, 0) / silScores.length;
      let curAnchorCluster = 0;
      if (anchorIndices && !freezeAnchorsInZeroCluster) {
        const { anchorClusterIndex, numAnchorItemsInCluster } =
          getBestAnchorClusterInfo(bestItemsForK.indices, anchorIndices);
        curAnchorCluster = anchorClusterIndex;
        const penalty =
          (MISSING_ANCHOR_IN_CLUSTER_PENALTY *
            (anchorIndices.length - numAnchorItemsInCluster)) /
          anchorIndices.length;
        avgSil -= penalty;
      }
      if (avgSil > bestResultSilScore) {
        bestResultSilScore = avgSil;
        bestResult = bestItemsForK.indices;
        bestResultCenterCluster = curAnchorCluster;
      }
    }
    const result = new SmartTabGroupingResult({
      indices: bestResult,
      tabs,
      embeddings,
      config: this.config,
    });
    if (anchorIndices) {
      result.setAnchorClusterIndex(
        freezeAnchorsInZeroCluster ? 0 : bestResultCenterCluster
      ); // In our k-means clustering implementation anchor cluster is always first
      if (!freezeAnchorsInZeroCluster) {
        result.adjustClusterForAnchors(anchorIndices);
      }
    }
    return result;
  }

  /**
   * Generates clusters for a given list of tabs using precomputed embeddings or newly generated ones.
   *
   * @param {Object[]} tabList - List of tab objects to be clustered.
   * @param {number[][]} [precomputedEmbeddings] - Precomputed embeddings for tab titles and descriptions.
   * @param {number} numClusters - Number of clusters to form.
   * @param {Function} randFunc - Random function used for clustering initialization.
   * @param {number[]} [anchorIndices=[]] - Indices of anchor tabs that should be prioritized in clustering.
   * @param {number[]} [alreadyGroupedIndices=[]] - Indices of tabs that are already assigned to groups.
   * @returns {SmartTabGroupingResult} - The best clustering result based on centroid inertia.
   */
  async generateClusters(
    tabList,
    precomputedEmbeddings,
    numClusters,
    randFunc,
    anchorIndices = [],
    alreadyGroupedIndices = []
  ) {
    numClusters = numClusters ?? 0;
    const structuredData = await this._prepareTabData(tabList);

    // embeddings for title and description
    if (precomputedEmbeddings) {
      this.docEmbeddings = precomputedEmbeddings;
    } else {
      this.docEmbeddings = await this._generateEmbeddings(
        structuredData.map(a => a[EMBED_TEXT_KEY])
      );
    }
    let bestResultCluster;
    let bestResultDistance = 50000000.0;

    const NUM_RUNS = 1;
    for (let i = 0; i < NUM_RUNS; i++) {
      const curResult = this._clusterEmbeddings({
        tabs: tabList,
        embeddings: this.docEmbeddings,
        k: numClusters,
        randomFunc: randFunc,
        anchorIndices,
        alreadyGroupedIndices,
      });
      const distance = curResult.getCentroidInertia();
      if (distance < bestResultDistance) {
        bestResultDistance = distance;
        bestResultCluster = curResult;
      }
    }
    return bestResultCluster;
  }

  /**
   * Create static cluster from a list of tabs. A single tab is Ok. Returns null for 0 tabs
   * @param tabs
   * @returns {SmartTabGroupingResult} groupingResult
   */
  createStaticCluster(tabs) {
    if (!tabs) {
      return null;
    }

    return new SmartTabGroupingResult({
      indices: [Array.from({ length: tabs.length }, (_, i) => i)],
      tabs,
      config: this.config,
    });
  }

  /**
   * Generate model input from keywords and documents
   * @param {string []} keywords
   * @param {string []} documents
   */
  createModelInput(keywords, documents) {
    if (!keywords || keywords.length === 0) {
      return `Topic from keywords: titles: \n${documents.join(" \n")}`;
    }
    return `Topic from keywords: ${keywords.join(", ")}. titles: \n${documents.join(" \n")}`;
  }

  /**
   * Add titles to a cluster in a SmartTabGroupingResult using generative tehniques
   * Currently this function only works with a single target group, and a separate
   * item that represents all other ungrouped tabs.
   *
   * In the future this may be updated to more generally find labels for a set of clusters.
   * @param {SmartTabGroupingResult} groupingResult The cluster we are generating the label for
   * @param {SmartTabGroupingResult} otherGroupingResult A 'made up' cluster representing all other tabs in the window
   */
  async generateGroupLabels(groupingResult, otherGroupingResult = null) {
    const { keywords, documents } =
      groupingResult.getRepresentativeDocsAndKeywords(
        otherGroupingResult
          ? otherGroupingResult.getRepresentativeDocuments()
          : []
      );
    const inputArgs = this.createModelInput(
      keywords ? keywords[0] : [],
      documents
    );
    const requestInfo = {
      inputArgs,
      runOptions: {
        max_length: 6,
      },
    };

    if (!this.topicEngine || this.topicEngine?.engineStatus === "closed") {
      this.topicEngine = await this._createMLEngine(
        this.config.topicGeneration
      );
    }
    const request = {
      args: [requestInfo.inputArgs],
      options: requestInfo.runOptions,
    };
    const genLabelResults = await this.topicEngine.run(request);
    genLabelResults.forEach((genResult, genResultIndex) => {
      groupingResult.clusterRepresentations[
        genResultIndex
      ].predictedTopicLabel = (
        (genResult.generated_text || "").trim() === DISSIMILAR_TAB_LABEL
          ? ""
          : genResult.generated_text || ""
      ).trim();
    });
  }

  /**
   * Generates glean metrics for ml smart tab label / topic.
   * This is currently called when the user saves or cancels the "suggest label" flow.
   *
   * @param {string} action "save" or "cancel"
   * @param {number} numTabsInGroup Number of tabs used to generate the label
   * @param {string} mlLabel ML generated label for the tab group
   * @param {string} userLabel User saved label for the tab group
   */
  handleLabelTelemetry({ action, numTabsInGroup, mlLabel, userLabel }) {
    Glean.browserMlInteraction.smartTabTopic.record({
      action,
      num_tabs_in_group: numTabsInGroup,
      ml_label_length: (mlLabel || "").length,
      user_label_length: (userLabel || "").length,
      levenshtein_distance: lazy.NLP.levenshtein(
        userLabel || "",
        mlLabel || ""
      ),
    });
  }

  /**
   * Generates glean metrics for ml smart tab label / topic.
   * This is currently called when the user saves or cancels the "suggest other tabs" flow
   *
   * @param {string} action "save" or "cancel"
   * @param {number} numTabsInWindow Number of tabs in the current window
   * @param {number} numTabsInGroup Number of tabs in the current group
   * @param {number} numTabsSuggested Number of tabs suggested by the model
   * @param {number} numTabsApproved Number of tabs approved by the user
   * @param {number} numTabsRemoved Number of tabs removed by the user
   */
  handleSuggestTelemetry({
    action,
    numTabsInWindow,
    numTabsInGroup,
    numTabsSuggested,
    numTabsApproved,
    numTabsRemoved,
  }) {
    Glean.browserMlInteraction.smartTabSuggest.record({
      action,
      num_tabs_in_window: numTabsInWindow,
      num_tabs_in_group: numTabsInGroup,
      num_tabs_suggested: numTabsSuggested,
      num_tabs_approved: numTabsApproved,
      num_tabs_removed: numTabsRemoved,
    });
  }
}

export class SmartTabGroupingResult {
  #anchorClusterIndex = -1; // Index of cluster that has original items we're building clustering around, when building around an existing item.

  /**
   * Creates a result from indices and complete tab and embedding lists.
   * This may create some extra data for management later
   * @param indices indices of clusters (eg [[2,4], [1], [3]]_
   * @param tabItems 1D array of tabs
   * @param embeddingItems Two dimensional array of embeddings
   * @param config Cluster config
   */
  constructor({ indices = [], tabs, embeddings, config }) {
    this.embeddingItems = embeddings;
    this.config = config;
    this.indices = indices.filter(subArray => !!subArray.length); // Cleanup any empty clusters
    this.tabItems = tabs;
    this._buildClusterRepresentations();
  }

  /**
   * Builds list of ClusterRepresentations
   */
  _buildClusterRepresentations() {
    this.clusterRepresentations = this.indices.map(subClusterIndices => {
      const tabItemsMapped =
        this.tabItems && subClusterIndices.map(idx => this.tabItems[idx]);
      const embeddingItemsMapped =
        this.embeddingItems &&
        subClusterIndices.map(idx => this.embeddingItems[idx]);
      return new ClusterRepresentation({
        tabs: tabItemsMapped,
        embeddings: embeddingItemsMapped,
        config: this.config,
      });
    });
  }

  /**
   * Returns a list of documents for each cluster. Currently it is a list of documents picked
   * in no particular order.
   * @return {[strings]} Title and description that represent the cluster. (If no docs are in the class, then titles are returned)
   */
  getRepresentativeDocuments() {
    if (!this.documents) {
      this.documents = this.tabItems.map(
        t => t[this.config.dataConfig.titleKey]
      );
    }
    // set a limit of 10 for now
    return this.documents.slice(0, 10);
  }

  /**
   * Returns the keywords and documents for the cluster, computing if needed
   * Does not return keywods if only one document is passed to the function.
   * @param{string[]} otherDocuments other clusters that we'll compare against
   * @return keywords and documents that represent the cluster
   */
  getRepresentativeDocsAndKeywords(otherDocuments = []) {
    this.documents = this.getRepresentativeDocuments();
    if (!this.keywords) {
      const joinedDocs = this.documents.slice(0, 3).join(" ");
      const otherDocs = otherDocuments.join(" ");
      if (this.documents.length > 1) {
        const keywordExtractor = new KeywordExtractor();
        this.keywords = keywordExtractor.fitTransform([joinedDocs, otherDocs]);
      } else {
        this.keywords = [];
      }
    }
    return { keywords: this.keywords, documents: this.documents };
  }

  setAnchorClusterIndex(index) {
    this.#anchorClusterIndex = index;
  }

  /**
   * Get the cluster we originally are grouping around (finding additinoal item)
   * @returns ClusterRepresentation
   */
  getAnchorCluster() {
    if (this.#anchorClusterIndex === -1) {
      return null;
    }
    return this.clusterRepresentations[this.#anchorClusterIndex];
  }

  /**
   *   Given the indices that we were clustering around, make sure they are are all in the target grouping
   *   Our generic k-means clustering might have them in separate groups
   */
  adjustClusterForAnchors(anchorIndices) {
    if (!anchorIndices.length) {
      return;
    }
    const anchorSet = new Set(anchorIndices);
    for (let i = 0; i < this.indices.length; i++) {
      if (i === this.#anchorClusterIndex) {
        continue;
      }
      this.indices[i] = this.indices[i].filter(item => {
        if (anchorSet.has(item)) {
          this.indices[this.#anchorClusterIndex].push(item);
          return false;
        }
        return true;
      });
    }
    this._buildClusterRepresentations();
  }

  /**
   * Prints information about the cluster
   */
  printClusters() {
    for (let cluster of this.clusterRepresentations) {
      cluster.print();
    }
  }

  /**
   * Computes the inertia of the cluster which is the sum of square total distance.
   * @returns {number}
   */
  getCentroidInertia() {
    let runningTotalDistance = 0;
    this.clusterRepresentations.forEach(rep => {
      runningTotalDistance += rep.computeTotalSquaredCentroidDistance();
    });
    return runningTotalDistance;
  }

  /**
   * Converts a cluster representation to a flat list of tabs, with clusterID key in each
   * tab representing the id of the cluster it was part of.
   * @returns {[Object]}
   */
  _flatMapItemsInClusters() {
    return this.clusterRepresentations.reduce((result, clusterRep) => {
      const annotatedTabs = clusterRep.tabs.map(a => {
        let c = {};
        Object.assign(c, a);
        c.clusterID = clusterRep.clusterID;
        return c;
      });
      return result.concat(annotatedTabs);
    }, []);
  }

  /**
   * Get rand score which describes the accuracy versus a user labeled
   * annotation on the dataset. Requires the dataset to be labeled.
   * @param labelKey Key in the tabs that represent a unique label ID for the cluster.
   * @returns {number} The rand score.
   */
  getRandScore(labelKey = "annotatedLabel") {
    const combinedItems = this._flatMapItemsInClusters();
    return computeRandScore(combinedItems, "clusterID", labelKey);
  }

  /**
   * Get accuracy for a specific cluster
   * @param labelKey Key in the tabs that represent a unique label ID for the cluster.
   * @param clusterValue is the cluster we are comparing
   * @returns {number} The rand score.
   */
  getAccuracyStatsForCluster(labelKey = "annotatedLabel", clusterValue) {
    const combinedItems = this._flatMapItemsInClusters();

    let keyClusterId = combinedItems.find(
      a => a[labelKey] === clusterValue
    ).clusterID;

    let truePositives = 0,
      trueNegatives = 0,
      falseNegatives = 0,
      falsePositives = 0;

    combinedItems.forEach(item => {
      const sameLabel = item[labelKey] === clusterValue;
      const sameCluster = item.clusterID === keyClusterId;
      if (sameLabel && sameCluster) {
        truePositives++;
      }
      if (!sameLabel && !sameCluster) {
        trueNegatives++;
      }
      if (sameLabel && !sameCluster) {
        falseNegatives++;
      }
      if (!sameLabel && sameCluster) {
        falsePositives++;
      }
    });
    return getAccuracyStats({
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives,
    });
  }
}

/**
 * Utility function to generate a random ID string
 * @param len Length of the string
 * @returns {string}
 */
function genHexString(len) {
  const hex = "0123456789ABCDEF";
  let output = "";
  for (let i = 0; i < len; ++i) {
    output += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return output;
}

class EmbeddingCluster {
  constructor({ tabs, embeddings, centroid }) {
    this.embeddings = embeddings;
    this.centroid =
      centroid || (embeddings && computeCentroidFrom2DArray(this.embeddings));
    this.tabs = tabs;
  }

  /**
   * @returns total sum euclidan squared distance of each item from cluster's centroid
   */
  computeTotalSquaredCentroidDistance() {
    let totalDistance = 0;
    if (this.embeddings.length === 0) {
      return 0;
    }
    this.embeddings.forEach(embedding => {
      totalDistance += euclideanDistance(this.centroid, embedding, true);
    });
    return totalDistance;
  }

  /**
   * Returns number of items in the cluster
   * @returns {int}
   */
  numItems() {
    return this.tabs.length;
  }
}

/**
 * Represents a single cluster with additional saved metadata
 */
export class ClusterRepresentation extends EmbeddingCluster {
  constructor({ tabs, embeddings, centroid, config }) {
    super({ tabs, embeddings, centroid });
    this.config = config;
    this.predictedTopicLabel = null;
    this.annotatedTopicLabel = null;
    this.userEditedTopicLabel = null;
    this.representativeText = null;
    this.keywords = null;
    this.documents = null;
    this.clusterID = genHexString(10);
  }

  /**
   * Returns the representative text for a cluster, computing it if needed
   */
  getRepresentativeText() {
    if (!this.representativeText) {
      this.representativeText = this._generateRepresentativeText();
    }
    return this.representativeText;
  }

  /**
   * Returns representative text for a cluster.
   * For this in initial implementation it simply returns title from a few tabs
   * @returns {string}
   * @private
   */
  _generateRepresentativeText() {
    let text = "";
    const titleKey = this.config.dataConfig.titleKey;
    for (const tab of this.tabs.slice(0, 3)) {
      text += `\n${tab[titleKey]}`;
    }
    return text;
  }

  print() {
    // Add console log for debugging
  }
}
