import React from 'react';
import { connect } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';

import { updateFilters } from '../../actions';
import defaultFilter from '../../reducers';
import ResultsList from './ResultsList';

class Results extends React.Component {
  state = {
    findings: [],
  };

  resetDefaultState = () => {
    this.setState({
      findings: [],
    });
    // browser.browserAction.setBadgeText({text: '0'});
  };

  componentDidUpdate(previousProps, previousState) {
    let tabId = this.props.tabid;
    let findings = this.props.warehouse[tabId];
    let filters = this.props.filters[tabId] ?? defaultFilter;

    if (findings) {
      let filteredFindings = findings.filter((finding) => {
        let source =
          filters['sources'].length <= 0 ||
          filters['sources'].some((r) =>
            finding.sources.some((v) => v.indexOf(r) >= 0)
          );
        let sink =
          filters['sinks'].length <= 0 ||
          filters['sinks'].some((r) => finding.sink.indexOf(r) >= 0);
        return source && sink;
      });
      if (previousState.findings.length !== filteredFindings.length) {
        this.setState({
          findings: filteredFindings,
        });
        // browser.browserAction.setBadgeText({text: (filteredFindings.length).toString()});
      }
    } else {
      if (previousState.findings.length !== 0) {
        this.resetDefaultState();
      }
    }
  }

  render() {
    return (
      <>
        <ResultsList findings={this.state.findings} />
        {this.props.filters.loading ? <CircularProgress /> : null}
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return { warehouse: state.warehouse, filters: state.filters };
};

export default connect(mapStateToProps, {
  updateFilters,
})(Results);
