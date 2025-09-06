import React from 'react';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ListIcon from '@mui/icons-material/List';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import Filters from './Filters';
import Options from './Options';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  const StyledBox = styled(Box)({
    padding: '10px'
  });

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-force-tabpanel-${index}`}
      aria-labelledby={`scrollable-force-tab-${index}`}
      {...other}
    >
      {
        <StyledBox component="div" p={3}>
          <Typography component="span">{children}</Typography>
        </StyledBox>
      }
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function a11yProps(index) {
  return {
    id: `scrollable-force-tab-${index}`,
    'aria-controls': `scrollable-force-tabpanel-${index}`,
  };
}

const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  width: '100%',
  backgroundColor: theme.palette.background.paper,
}));

const StyledTab = styled(Tab)({
  padding: '0px 50px 0px 50px',
});

export default function ScrollableTabsButtonForce(props) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Root>
      <AppBar position="static" color="default">
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="on"
          indicatorColor="primary"
          textColor="primary"
          aria-label="scrollable force tabs example"
        >
          <StyledTab label="Results" icon={<ListIcon />} {...a11yProps(0)} />
          <StyledTab label="Filter" icon={<SearchIcon />} {...a11yProps(1)} />
          <StyledTab label="Options" icon={<TuneIcon />} {...a11yProps(2)} />
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0}></TabPanel>
      <TabPanel value={value} index={1}>
        <Filters tabid={props.tabid} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Options />
      </TabPanel>
    </Root>
  );
}
