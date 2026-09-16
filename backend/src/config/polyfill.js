/**
 * WebCrypto Polyfill for Node runtime compatibility.
 * Ensures crypto.getRandomValues is present globally and on the crypto module for MongoDB driver 6+.
 */
import crypto from 'node:crypto';

if (!crypto.getRandomValues && crypto.webcrypto) {
  crypto.getRandomValues = (buffer) => crypto.webcrypto.getRandomValues(buffer);
}

if (!globalThis.crypto) {
  globalThis.crypto = crypto;
} else if (!globalThis.crypto.getRandomValues && crypto.webcrypto) {
  globalThis.crypto.getRandomValues = (buffer) => crypto.webcrypto.getRandomValues(buffer);
}

export default crypto;
