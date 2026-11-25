import { describe, it, expect } from 'vitest'
import {
  deriveClientKek,
  generateZkDek,
  wrapZkDek,
  unwrapZkDek,
  encryptZkField,
  decryptZkField,
  isZkEnvelope,
  randomSaltHex,
  zkKeyManager,
} from '../zkCrypto'

describe('Client-Side Zero-Knowledge Crypto (WebCrypto)', () => {
  it('derives KEK, wraps/unwraps DEK, and round-trips AES-256-GCM field encryption with AAD', async () => {
    const salt = randomSaltHex(16)
    const kek = await deriveClientKek('strong-family-passphrase-2026!', salt, 10_000)
    const dek = await generateZkDek()

    const wrapped = await wrapZkDek(dek, kek)
    expect(isZkEnvelope(wrapped)).toBe(true)

    const unwrappedDek = await unwrapZkDek(wrapped, kek)
    zkKeyManager.setDek(unwrappedDek)
    expect(zkKeyManager.isUnlocked).toBe(true)

    const secret = 'ABCDE1234F'
    const enc = await encryptZkField(secret, zkKeyManager.getDek(), 'tenant-1:pan')
    expect(isZkEnvelope(enc)).toBe(true)
    expect(enc).not.toContain(secret)

    const dec = await decryptZkField(enc, zkKeyManager.getDek(), 'tenant-1:pan')
    expect(dec).toBe(secret)

    // Wrong AAD must fail authentication
    await expect(decryptZkField(enc, zkKeyManager.getDek(), 'tenant-2:pan')).rejects.toThrow()

    zkKeyManager.lock()
    expect(zkKeyManager.isUnlocked).toBe(false)
  })
})
