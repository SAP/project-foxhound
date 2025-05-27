import React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { truncate } from './Finding';

import TaintTable from './TaintTable';

const Root = styled('div')({
  width: '100%',
  '&.Mui-expanded': {
    minHeight: 0,
  },
});

const StyledAccordionSummary = styled(AccordionSummary)({
  backgroundColor: '#ff00002e',
  minHeight: 0,
});

const StyledTypography = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(15),
  // fontWeight: theme.typography.fontWeightRegular,
  margin: 0,
  fontWeight: 'bold',
}));

const Snippet = ({ finding, taint }) => {

  const [expanded, setExpanded] = React.useState(false);

  const handleChange = (event, isExpanded) => {
    setExpanded(isExpanded);
  };

  return (
    <Root>
      <Accordion TransitionProps={{ unmountOnExit: true }} onChange={handleChange}>
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <StyledTypography>
            {expanded ? finding.str.substring(taint.begin, taint.end) : truncate(finding.str.substring(taint.begin, taint.end))}
          </StyledTypography>
        </StyledAccordionSummary>
        <AccordionDetails>
          <TaintTable taint={taint} />
        </AccordionDetails>
      </Accordion>
    </Root>
  );
};

export default Snippet;
