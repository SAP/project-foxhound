import React from 'react';
import { connect } from 'react-redux';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import { updateConfiguration } from '../../actions';

class Options extends React.Component {
  handleChange(event) {
    this.props.updateConfiguration({
      [event.target.name]: event.target.checked,
    });
  }

  render() {
    return (
      <FormControl component="fieldset">
        <FormLabel component="legend">Taint Notifier configuration:</FormLabel>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={this.props.configuration['generation']}
                onChange={(event) =>
                  this.props.updateConfiguration({
                    [event.target.name]: event.target.checked,
                  })
                }
                name="generation"
              />
            }
            label="Generation"
          />
          <FormControlLabel
            control={
              <Switch
                checked={this.props.configuration['validation']}
                onChange={(event) =>
                  this.props.updateConfiguration({
                    [event.target.name]: event.target.checked,
                  })
                }
                name="validation"
              />
            }
            label="Validation"
          />
          <FormControlLabel
            control={
              <Switch
                checked={this.props.configuration['export']}
                onChange={(event) =>
                  this.props.updateConfiguration({
                    [event.target.name]: event.target.checked,
                  })
                }
                name="export"
              />
            }
            label="Export"
          />
        </FormGroup>
      </FormControl>
    );
  }
}

const mapStateToProps = (state) => {
  return { configuration: state.configuration };
};

export default connect(mapStateToProps, {
  updateConfiguration,
})(Options);
