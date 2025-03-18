import React from 'react';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

const MultiSelect = (props) => {
  return (
    <Autocomplete
      multiple
      id="tags-standard"
      options={props.values}
      getOptionLabel={(option) => option.title}
      defaultValue={[]}
      onChange={props.handleUpdate}
      autoComplete={true}
      autoHighlight={true}
      groupBy={(option) => option.group}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          label={props.label}
          placeholder={props.label}
        />
      )}
    />
  );
};

export default MultiSelect;
