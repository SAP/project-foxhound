import { combineReducers } from 'redux';
export const defaultFilter = { sources: [], sinks: [], findings: [], loading: false };

const hasFinding = (warehouse, finding) => {
  const existingFindings = warehouse[finding.tabId];
  for (let i = 0; i < existingFindings.length; i++) {
    if (existingFindings[i].hash === finding.hash) {
      return true;
    }
  }
  return false;
};

const warehouseReducer = (warehouse = {}, action) => {
  if (action.type === 'NEW_FINDING') {
    let findings = action.payload;
    let tabId = findings[0].tabId;
    if (!(tabId in warehouse)) {
      return { ...warehouse, [tabId]: findings };
    }
    findings = findings.filter((finding) => !hasFinding(warehouse, finding));
    if (findings.length > 0) {
      return { ...warehouse, [tabId]: [...warehouse[tabId], ...findings] };
    }

    return warehouse;
  }
  if (action.type === 'REMOVE_FINDINGS') {
    const nextState = { ...warehouse };
    delete nextState[action.payload];
    return nextState;
  }
  return warehouse;
};

const filtersReducer = (
  filters = { },
  action
) => {
  if (action.type === 'UPDATE_FILTERS') {
    if (!(action.tabId in filters)) {
      // First time this tab id is seen in filter
      let newFilter = { [action.tabId]: {...defaultFilter, ...action.payload }};
      return { ...filters, ...newFilter };
    }

    let newFilter = { [action.tabId]: {...filters[action.tabId], ...action.payload }};
    return { ...filters, ...newFilter };
  }
  if (action.type === 'REMOVE_FINDINGS') {
    let newFilter = { ...filters };
    delete newFilter[action.payload];
    return newFilter;
  }
  return filters;
};

const configurationReducer = (configuration, action) => {
  if (action.type === 'UPDATE_CONFIGURATION') {
    const nextState = { ...configuration, ...action.payload };
    localStorage.setItem('configuration', JSON.stringify(nextState));
    return nextState;
  }
  let conf = localStorage.getItem('configuration');
  if (conf === null) {
    const defaultConfig = {
      generation: false,
      validation: false,
      export: false,
    };
    localStorage.setItem('configuration', JSON.stringify(defaultConfig));
    return defaultConfig;
  } else {
    return JSON.parse(conf);
  }
};

export default combineReducers({
  warehouse: warehouseReducer,
  filters: filtersReducer,
  configuration: configurationReducer,
});
