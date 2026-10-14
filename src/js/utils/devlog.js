/**
 * Development logging utilities
 * Only logs when window.SONOITE_DEBUG is true
 * STAB-06: Check flag dynamically to allow runtime toggling
 */

export const dlog = (...args) => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.log(...args);
  }
};

export const dwarn = (...args) => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.warn(...args);
  }
};

export const derr = (...args) => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.error(...args);
  }
};

export const dgroup = (label) => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.group(label);
  }
};

export const dgroupEnd = () => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.groupEnd();
  }
};

export const dtable = (data) => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.table(data);
  }
};

export const dtime = (label) => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.time(label);
  }
};

export const dtimeEnd = (label) => {
  if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
    console.timeEnd(label);
  }
};