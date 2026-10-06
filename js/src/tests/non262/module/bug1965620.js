// |reftest| skip-if(!xulRuntime.shell) module -- requires shell-options

import { m } from './bug1965620-dep.js';

assertEq(m, 123);

if (typeof reportCompare == 'function')
    reportCompare(0, 0);
