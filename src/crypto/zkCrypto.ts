/**
 * WealthFam Client-Side Zero-Knowledge Cryptography Engine (WebCrypto API)
 *
 * All key derivation (PBKDF2-HMAC-SHA256, 600k iterations) and authenticated encryption
 * (AES-256-GCM) run strictly inside the browser. The server only ever stores opaque
 * wrapped DEK bundles and ciphertext envelopes (`zk:v1:...`).
 */

const ZK_PREFIX = 'zk:v1:'
const NONCE_BYTES = 12
const DEFAULT_PBKDF2_ITERATIONS = 600_000

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

export function randomSaltHex(byteLength = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export async function deriveClientKek(
  passphrase: string,
  saltHex: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex) as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  )
}

export async function generateZkDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function wrapZkDek(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(NONCE_BYTES))
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv })
  return `${ZK_PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(wrapped))}`
}

export async function unwrapZkDek(wrappedEnvelope: string, kek: CryptoKey): Promise<CryptoKey> {
  if (!wrappedEnvelope.startsWith(ZK_PREFIX)) {
    throw new Error('Invalid ZK wrapped DEK envelope')
  }
  const rest = wrappedEnvelope.slice(ZK_PREFIX.length)
  const [ivB64, ctB64] = rest.split(':')
  const iv = fromBase64(ivB64)
  const ct = fromBase64(ctB64)
  return crypto.subtle.unwrapKey(
    'raw',
    ct as BufferSource,
    kek,
    { name: 'AES-GCM', iv: iv as BufferSource },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export function isZkEnvelope(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith(ZK_PREFIX))
}

export async function encryptZkField(
  plaintext: string,
  dek: CryptoKey,
  aad?: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(NONCE_BYTES))
  const params: AesGcmParams = {
    name: 'AES-GCM',
    iv,
    ...(aad ? { additionalData: encoder.encode(aad) } : {}),
  }
  const ciphertext = await crypto.subtle.encrypt(params, dek, encoder.encode(plaintext))
  return `${ZK_PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`
}

export async function decryptZkField(
  envelope: string,
  dek: CryptoKey,
  aad?: string
): Promise<string> {
  if (!isZkEnvelope(envelope)) return envelope
  const rest = envelope.slice(ZK_PREFIX.length)
  const [ivB64, ctB64] = rest.split(':')
  const iv = fromBase64(ivB64)
  const ct = fromBase64(ctB64)
  const params: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv as BufferSource,
    ...(aad ? { additionalData: encoder.encode(aad) } : {}),
  }
  const plainBuf = await crypto.subtle.decrypt(params, dek, ct as BufferSource)
  return decoder.decode(plainBuf)
}

export async function encryptZkBlob(file: Blob, dek: CryptoKey): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(NONCE_BYTES))
  const raw = await file.arrayBuffer()
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, raw))
  const magic = encoder.encode('WFZK01')
  const out = new Uint8Array(magic.length + iv.length + ct.length)
  out.set(magic, 0)
  out.set(iv, magic.length)
  out.set(ct, magic.length + iv.length)
  return out
}

export async function decryptZkBlob(
  encryptedBytes: ArrayBuffer,
  dek: CryptoKey,
  mimeType = 'application/octet-stream'
): Promise<Blob> {
  const view = new Uint8Array(encryptedBytes)
  const magic = decoder.decode(view.slice(0, 6))
  if (magic !== 'WFZK01') {
    throw new Error('Invalid ZK blob header')
  }
  const iv = view.slice(6, 6 + NONCE_BYTES)
  const ct = view.slice(6 + NONCE_BYTES)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, ct)
  return new Blob([plain], { type: mimeType })
}

/**
 * In-memory volatile key holder — never persisted to localStorage or sessionStorage.
 */
class ZkKeyManager {
  private activeDek: CryptoKey | null = null

  get isUnlocked(): boolean {
    return this.activeDek !== null
  }

  setDek(dek: CryptoKey) {
    this.activeDek = dek
  }

  getDek(): CryptoKey {
    if (!this.activeDek) {
      throw new Error('Zero-Knowledge vault is locked')
    }
    return this.activeDek
  }

  lock() {
    this.activeDek = null
  }
}

export const zkKeyManager = new ZkKeyManager()
