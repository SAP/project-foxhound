import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { Store } from 'webext-redux';

import Panel from './Components/Panel';

const store = new Store();

store.ready().then(() => {
  let root = (createRoot(document.getElementById('root')));
  root.render(
    <Provider store={store}>
      <Panel tabid={browser.devtools.inspectedWindow.tabId}/>
    </Provider>
  );
});
