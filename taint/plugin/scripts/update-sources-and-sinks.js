const url = 'https://raw.githubusercontent.com/SAP/project-foxhound/main/modules/libpref/init/all.js';
const configPath = 'config/taintfox-sources-sinks/all.txt';
const https = require('https');
const fs = require('fs');

https.get(url, resp => {
  if(resp.statusCode !== 200) {
    console.error(`Cannot update sources and sinks, error downloading file (Error ${resp.statusCode})`);
    return;
  }
  resp.pipe(fs.createWriteStream(configPath));
}).on('error', err => {
  console.error(`Cannot update sources and sinks, error downloading file: ${err.message}`);
});