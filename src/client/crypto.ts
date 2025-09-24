(() => {
  const global = window as any;
  const subtle = (global.crypto && (global.crypto as any).subtle) || (global.msCrypto && (global.msCrypto as any).subtle);
  if (!subtle) { console.warn('WebCrypto not available; encryption disabled'); }
  const utf8Encode = (str: string) => new TextEncoder().encode(str);
  const utf8Decode = (buf: ArrayBuffer) => new TextDecoder().decode(buf);
  const b64encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...Array.from(bytes)));
  const b64decode = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  async function deriveKey(passphrase: string, saltB64?: string, iterations = 150000) {
    const salt = saltB64 ? b64decode(saltB64) : (global.crypto.getRandomValues(new Uint8Array(16)));
    const keyMaterial = await (subtle as any).importKey('raw', utf8Encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await (subtle as any).deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
    return { key, saltB64: b64encode(salt) };
  }

  async function encryptJSON(obj: any, passphrase: string) {
    if (!subtle) throw new Error('Crypto not available');
    const { key, saltB64 } = await deriveKey(passphrase);
    const iv = (global.crypto as any).getRandomValues(new Uint8Array(12));
    const plaintext = utf8Encode(JSON.stringify(obj));
    const ciphertext = await (subtle as any).encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return { v:1, alg: 'AES-GCM-256+PBKDF2-SHA256', salt: saltB64, iv: b64encode(iv), ct: b64encode(new Uint8Array(ciphertext)) };
  }

  async function decryptJSON(payload: any, passphrase: string) {
    if (!subtle) throw new Error('Crypto not available');
    if (!payload || typeof payload !== 'object') throw new Error('Invalid cipher payload');
    const { key } = await deriveKey(passphrase, payload.salt);
    const iv = b64decode(payload.iv);
    const ct = b64decode(payload.ct);
    const plaintext = await (subtle as any).decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(utf8Decode(plaintext));
  }
  (window as any).CryptoUtils = { encryptJSON, decryptJSON };
})();
