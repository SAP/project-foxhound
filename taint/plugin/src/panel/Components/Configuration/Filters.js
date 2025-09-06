import React from 'react';
import { connect } from 'react-redux';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MultiSelect from './MultiSelect';
import { updateFilters } from '../../actions';
import { fetchSourcesAndSinks } from './SourcesAndSinks';

class Filters extends React.Component {

  state = {
    sources: [],
    sinks: [],
  };

  render() {

    const updateSources = (event, values) => {
      let sources = values.map((val) => val.title);
      this.props.updateFilters({ sources }, this.props.tabid);
    };
    const updateSinks = (event, values) => {
      let sinks = values.map((val) => val.title);
      this.props.updateFilters({ sinks }, this.props.tabid);
    };

    return (
      <FormControl fullWidth>
        <InputLabel htmlFor="findings"></InputLabel>
        <MultiSelect
          label="sources"
          values={this.state.sources}
          handleUpdate={updateSources}
        />
        <MultiSelect label="sinks" values={this.state.sinks} handleUpdate={updateSinks} />
      </FormControl>
    );
  }
  
  componentDidMount() {
    fetchSourcesAndSinks().then(({sources, sinks}) => {
      this.setState({sources, sinks});
    });
  }
}

const mapStateToProps = () => {
  return {};
};

export default connect(mapStateToProps, {
  updateFilters,
})(Filters);
