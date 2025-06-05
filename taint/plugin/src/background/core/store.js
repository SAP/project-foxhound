import { createStore } from 'redux';
import reducers from '../../panel/reducers';

const store = createStore(reducers);
export default store;
