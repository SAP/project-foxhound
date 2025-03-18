const sourceRegex = /pref\("tainting\.source\.([^"]+)", true\)/g;
const sinkRegex = /pref\("tainting\.sink\.([^"]+)", true\)/g;
function expandDottedStrings(input) {
  let accum = [];
  let parts = input.split('.');
  for (let i = 0; i < parts.length; i++) {
    let str = parts.slice(0, i + 1).join('.');
    accum.push(str);
  }
  return accum;
}

export const fetchSourcesAndSinks = () => {
  return fetch('/static/config/taintfox-sources-sinks/all.txt')
    .then(response => response.text())
    .then(data => {

      let sourcesSet = new Set();
      let sinksSet = new Set();
      let match;

      while ((match = sourceRegex.exec(data)) !== null) {
        expandDottedStrings(match[1]).forEach(item => {
          sourcesSet.add(item); 
        });
      }

      while ((match = sinkRegex.exec(data)) !== null) {
        expandDottedStrings(match[1]).forEach(item => {
          sinksSet.add(item);
        });
      }

      const sources = Array.from(sourcesSet).map(function (item) {
        return {title: item, group: item.split('.')[0]};
      });

      const sinks = Array.from(sinksSet).map(function (item) {
        return {title: item, group: item.split('.')[0]};
      });

      return {sources, sinks};

    });
};




