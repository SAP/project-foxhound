import React from 'react';
import TablePagination from '@mui/material/TablePagination';

import Finding from './Finding';
import { Pagination } from './pagination';

class ResultsList extends React.Component {
  state = {
    currentPage: 0,
    findingsPerPage: 10,
  };

  constructor(props) {
    super(props);
  }

  handleChangePage(event, newPage) {
    this.setState({ currentPage: newPage });
  }

  handleChangeRowsPerPage(event) {
    const findingsPerPage = parseInt(event.target.value, 10);
    this.setState({
      currentPage: 0,
      findingsPerPage: findingsPerPage,
    });
  }

  renderList(filteredPages) {
    if (this.props.findings.length > 0) {
      return filteredPages.getPage(this.state.currentPage).map((finding) => {
        return (
          <div className="item" key={finding.hash}>
            <Finding finding={finding} />
          </div>
        );
      });
    } else {
      return null;
    }
  }

  render() {
    const filteredPages = new Pagination(
      this.props.findings,
      this.state.findingsPerPage
    );
    return (
      <>
        <div className="ResultsList">{this.renderList(filteredPages)}</div>
        <TablePagination
          component="div"
          count={filteredPages.getResultsCount()}
          page={this.state.currentPage}
          onPageChange={this.handleChangePage.bind(this)}
          rowsPerPage={this.state.findingsPerPage}
          onRowsPerPageChange={this.handleChangeRowsPerPage.bind(this)}
        />
      </>
    );
  }
}

export default ResultsList;
