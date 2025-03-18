import React from 'react';
import './Panel.css';

import Configuration from './Configuration/Configuration';
import Results from './Results/Results';

const Panel = ({tabid}) => {
  return (
    <div className="App">
      <Configuration tabid={tabid} />
      <Results tabid={tabid} />
    </div>
  );
};

export default Panel;
