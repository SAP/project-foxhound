import { wrapStore } from 'webext-redux';
import './core/notifierMain';
import './core/newFindings';
import store from './core/store';

/* eslint-disable no-undef */
console.log('Background.js file loaded');

// wrapping the store
wrapStore(store);

/* const defaultUninstallURL = () => {
  return process.env.NODE_ENV === 'production'
    ? 'https://wwww.github.com/kryptokinght'
    : '';
}; */
