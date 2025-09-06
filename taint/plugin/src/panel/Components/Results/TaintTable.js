import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import { AutoSizer, Column, Table } from 'react-virtualized';
import { styled } from '@mui/material/styles';

class MuiVirtualizedTable extends React.PureComponent {
  static defaultProps = {
    headerHeight: 48,
    rowHeight: 72,
  };

  getRowClassName = ({ index }) => {
    const { onRowClick } = this.props;

    return clsx('tableRow', 'flexContainer', {
      ['tableRowHover']: index !== -1 && onRowClick != null,
    });
  };

  cellRenderer = ({ cellData, columnIndex }) => {
    const { columns, rowHeight, onRowClick } = this.props;
    return (
      <TableCell
        component="div"
        className={clsx('tableCell', 'flexContainer', {
          ['noClick']: onRowClick == null,
        })}
        variant="body"
        style={{ height: rowHeight }}
        align={
          (columnIndex != null && columns[columnIndex].numeric) || false
            ? 'right'
            : 'left'
        }
      >
        {cellData}
      </TableCell>
    );
  };

  headerRenderer = ({ label, columnIndex }) => {
    const { headerHeight, columns } = this.props;

    return (
      <TableCell
        component="div"
        className={clsx(
          'tableCell',
          'flexContainer',
          'noClick'
        )}
        variant="head"
        style={{ height: headerHeight }}
        align={columns[columnIndex].numeric || false ? 'right' : 'left'}
      >
        <span>{label}</span>
      </TableCell>
    );
  };

  render() {
    const {
      columns,
      rowHeight,
      headerHeight,
      ...tableProps
    } = this.props;
    return (
      <AutoSizer>
        {({ height, width }) => (
          <Table
            height={height}
            width={width}
            rowHeight={rowHeight}
            gridStyle={{
              direction: 'inherit',
            }}
            headerHeight={headerHeight}
            className="table"
            {...tableProps}
            rowClassName={this.getRowClassName}
          >
            {columns.map(({ dataKey, ...other }, index) => {
              return (
                <Column
                  key={dataKey}
                  headerRenderer={(headerProps) =>
                    this.headerRenderer({
                      ...headerProps,
                      columnIndex: index,
                    })
                  }
                  className="flexContainer"
                  cellRenderer={this.cellRenderer}
                  dataKey={dataKey}
                  {...other}
                />
              );
            })}
          </Table>
        )}
      </AutoSizer>
    );
  }
}

MuiVirtualizedTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      dataKey: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      numeric: PropTypes.bool,
      width: PropTypes.number.isRequired,
    })
  ).isRequired,
  headerHeight: PropTypes.number,
  onRowClick: PropTypes.func,
  rowHeight: PropTypes.number,
};

const VirtualizedTable = styled(MuiVirtualizedTable)(({ theme }) => ({
  '& .flexContainer': {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  '& .table': {
    // temporary right-to-left patch, waiting for
    // https://github.com/bvaughn/react-virtualized/issues/454
    '& .ReactVirtualized__Table__headerRow': {
      flip: false,
      paddingRight: theme.direction === 'rtl' ? '0 !important' : undefined,
    },
  },
  '& .tableRow': {
    cursor: 'pointer',
  },
  '& .tableRowHover': {
    '&:hover': {
      backgroundColor: theme.palette.grey[200],
    },
  },
  '& .tableCell': {
    flex: 1,
  },
  '& .noClick': {
    cursor: 'initial',
  },
}));

const buildLink = (uri, flowPart) => {
  let sourceUri =
    'view-source:' +
    uri.protocol +
    '//' +
    uri.host +
    uri.pathname +
    '#line' +
    flowPart.location.line;
  let linkText =
    uri.pathname + ':' + flowPart.location.line + ':' + flowPart.location.pos;
  return (
    <a href={sourceUri} target="_blank">
      {linkText}
    </a>
  );
};

const TaintTable = ({ taint }) => {
  const rows = [];

  for (let i = taint.flow.length - 1; i >= 0; --i) {
    let flowPart = taint.flow[i];
    let parms = flowPart.arguments.slice(0, 2).filter((n) => n !== '');
    let taintflow =
      flowPart.operation +
      ' (' +
      flowPart.builtin +
      ')' +
      (parms.length > 0 ? ' ' + JSON.stringify(parms) : '');
    let fctname = flowPart.location.function;
    let script;
    try {
      let uri = new URL(flowPart.location.filename);
      script = buildLink(uri, flowPart);
    } catch (e) {
      script = flowPart.location.filename;
    }
    let argi = '';
    rows.push({
      i,
      taintflow,
      fctname,
      script,
      argi,
    });
  }
  return (
    <Paper style={{ height: 400, width: '100%' }}>
      <VirtualizedTable
        rowCount={rows.length}
        rowGetter={({ index }) => rows[index]}
        columns={[
          {
            width: 550,
            label: 'TaintFlow',
            dataKey: 'taintflow',
          },
          {
            width: 200,
            label: 'Function\u00A0name',
            dataKey: 'fctname',
          },
          {
            width: 400,
            label: 'Script:Line\u00A0number',
            dataKey: 'script',
          },
          {
            width: 60,
            label: 'Argument\u00A0index',
            dataKey: 'argi',
          },
        ]}
      />
    </Paper>
  );
};

export default TaintTable;
