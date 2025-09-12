import { on } from '../utils/messagebus';
import store from './store';
import {
  addFinding,
  updateFilters,
  removeFindings,
} from '../../panel/actions';

let md5 = require('js-md5');

function createHash(taint) {
  let hashedFinding = md5.create();
  taint.forEach((range) => {
    range.flow.forEach((flow) => {
      let stringifiedFlow =
        flow.operation +
        ':' +
        flow.location.filename +
        ':' +
        flow.location.line +
        ':' +
        flow.location.pos;
      hashedFinding.update(stringifiedFlow);
    });
  });
  return hashedFinding.hex();
}

browser.tabs.onRemoved.addListener((tabId) => {
  store.dispatch(removeFindings(tabId));
});

on('findingToBackground', (message, sender) => {
  if (message.command === 'finding') {
    let findings = message.findings.map((finding) => ({
      ...finding,
      hash: createHash(finding.taint),
      tabId: sender.tab.id,
    }));
    let resFindings = [];
    findings.forEach((finding) => {
      let i = resFindings.findIndex((x) => x.hash == finding.hash);
      if (i <= -1) {
        resFindings.push(finding);
      }
    });
    store.dispatch(addFinding(resFindings));
  } else {
    console.warn('Unknown type of message!');
  }
});

on('loading', (message, sender) => {
  if (message.command === 'loading') {
    store.dispatch(updateFilters({ loading: message.loading }, sender.tab.id));
  }
});
