/* eslint-disable no-restricted-globals */
importScripts("/workers/jsQR.js");

self.onmessage = function (e) {
  const { data, width, height, id } = e.data;
  try {
    const code = jsQR(data, width, height, { inversionAttempts: "dontInvert" });
    self.postMessage({ id, text: code ? code.data : null });
  } catch (err) {
    self.postMessage({ id, text: null, error: err ? err.message : "decode_error" });
  }
};
