import { on } from '../utils/messagebus.js';

// get findings from browser
on('sendToBackend', (message) => {
  if (message.command === 'finding') {
    console.log('got finding: ' + message);
    // reportFinding(message.finding);
  } else {
    console.warn('Unknown type of message!');
  }
});
