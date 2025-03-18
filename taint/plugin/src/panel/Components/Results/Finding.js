import React, {useState} from 'react';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CodeIcon from '@mui/icons-material/Code';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';

import Snippet from './Snippet';

const Root = styled('div')(({ theme }) => ({
  width: '100%',
  fontFamily: theme.typography.fontFamily
}));

const StyledSnippet = styled(Snippet)({
  width: '100%',
});

const DomainTypography = styled(Typography)({
  marginLeft: 'auto',
});

const StyledAccordionDetails = styled(AccordionDetails)({
  backgroundColor: '#dfe6e917',
});

const StyledAccordionSummary = styled(AccordionSummary)({
  '&.Mui-expanded': {
    backgroundColor: '#dfe6e917',
  },
});

const StyledTable = styled('table')({
  width: '100%',
  marginRight: 'auto'
});

export const truncate = (str, length= 100) => {
  return str.length > length ? str.substring(0, length-3) + '...' : str;
};

const ChangeableText = ({ initialText, afterClickText }) => {
  const [text, setText] = useState(initialText);

  const handleClick = () => {
    setText(afterClickText);
  };

  return (
    <td onClick={handleClick}>
      {text}
    </td>
  );
};

const Finding = ({ finding, index }) => {
  const returnParts = () => {
    const elements = [];
    let charPosition = 0;
    finding.taint.forEach((taint, index) => {
      if (taint.begin > charPosition) {
        elements.push(
          <Root key={'l' + index}>
            {finding.str.substring(charPosition, taint.begin)}
          </Root>
        );
      }
      elements.push(
        <Root>
          <StyledSnippet finding={finding} taint={taint} key={'m' + index} />
        </Root>
      );
      charPosition = taint.end;
    });
    if (charPosition < finding.str.length) {
      elements.push(
        <Root key={'r' + index}>
          {finding.str.substring(charPosition, finding.str.length)}
        </Root>
      );
    }
    return elements;
  };
  return (
    <Root>
      <Accordion TransitionProps={{ unmountOnExit: true }}>
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography gutterBottom variant="h5" component="h2">
            {[...new Set(finding.sources)].join(', ')} <ArrowForwardIcon />{' '}
            {finding.sink}
          </Typography>
          <br />
          <DomainTypography
            variant="body2"
            color="textSecondary"
            component="span"
          >
            {finding.domain}
          </DomainTypography>
        </StyledAccordionSummary>
        <StyledAccordionDetails>
          <StyledTable>
            <tbody>
              <tr>
                <td>
                  <Tooltip title="Complete snippet that flows into the sink">
                    <IconButton aria-label="code">
                      <CodeIcon />
                    </IconButton>
                  </Tooltip>
                </td>
                <td>{returnParts()}</td>
              </tr>
              <tr>
                <td>
                  <Tooltip title="URL of the website where the flow was detected">
                    <IconButton
                      aria-label="link"
                      onClick={() => {
                        navigator.clipboard.writeText(finding.loc);
                      }}
                    >
                      <LinkIcon />
                    </IconButton>
                  </Tooltip>
                </td>
                <td>{finding.loc}</td>
              </tr>
              <tr>
                <td>
                  <Tooltip title="URL of the script where the flow was detected">
                    <IconButton
                      aria-label="script"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          finding.script + ':' + finding.line
                        );
                      }}
                    >
                      <DescriptionIcon />
                    </IconButton>
                  </Tooltip>
                </td>
                <ChangeableText initialText={truncate(finding.script + ':' + finding.line)} afterClickText={finding.script + ':' + finding.line} />
              </tr>
            </tbody>
          </StyledTable>
        </StyledAccordionDetails>
      </Accordion>
    </Root>
  );
};

export default Finding;
