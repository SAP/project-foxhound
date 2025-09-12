/* globals copyFinding */
(function() {
  'use strict';

  let findings = [];
  let oldLength = 0;
  let loading = false;

  // Event handler for Tainfox taint report
  function handleTaintReport(report) {
    var finding = copyFinding(report.detail);
    finding.domain = location.hostname;
    findings.push(finding);
  }

  setInterval(function() {
    if (findings.length !== oldLength) {
      oldLength = findings.length;
      if (!loading) {
        loading = true;
        browser.runtime.sendMessage({
          type: 'loading',
          data: {
            command: 'loading',
            loading: loading,
          },
        });
      }
    } else if (findings.length !== 0) {
      browser.runtime.sendMessage({
        type: 'findingToBackground',
        data: {
          command: 'finding',
          findings: findings,
        },
      });
      loading = false;
      findings = [];
      oldLength = 0;
      browser.runtime.sendMessage({
        type: 'loading',
        data: {
          command: 'loading',
          loading: loading,
        },
      });
    }
  }, 1000);

  // Event listener for Taintfox taint report
  window.addEventListener('__taintreport', handleTaintReport);
})(window);
