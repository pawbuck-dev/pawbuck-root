require("@testing-library/jest-dom");
const { TextEncoder, TextDecoder } = require("util");
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}
