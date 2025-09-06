export const addFinding = (findings) => {
  return {
    type: 'NEW_FINDING',
    payload: findings,
  };
};

export const removeFindings = (tabId) => {
  return {
    type: 'REMOVE_FINDINGS',
    payload: tabId,
  };
};

export const updateFilters = (filters, tabId) => {
  return {
    type: 'UPDATE_FILTERS',
    payload: filters,
    tabId: tabId
  };
};

export const updateConfiguration = (configuration) => {
  return {
    type: 'UPDATE_CONFIGURATION',
    payload: configuration,
  };
};
