import { ref } from 'vue'
import { financeApi } from '@/api/client'
import {
  deriveClientKek,
  generateZkDek,
  wrapZkDek,
  unwrapZkDek,
  encryptZkBlob,
  decryptZkBlob,
  randomSaltHex,
  zkKeyManager,
} from '@/crypto/zkCrypto'

const isZkUnlocked = ref(zkKeyManager.isUnlocked)
const zkEnrolled = ref(false)

/**
 * Composable for Client-Side Zero-Knowledge Vault encryption & key-bundle management.
 * Works on both HTTPS (public internet) and http://localhost (local dev Secure Context).
 */
export function useZkVault() {
  async function checkEnrollment(): Promise<boolean> {
    const res = await financeApi.getZkKeyBundle()
    zkEnrolled.value = Boolean(res.data?.enrolled)
    return zkEnrolled.value
  }

  async function enrollOrUnlockZk(passphrase: string): Promise<boolean> {
    const res = await financeApi.getZkKeyBundle()
    if (res.data?.enrolled) {
      const kek = await deriveClientKek(passphrase, res.data.kdf_salt, res.data.kdf_iterations || 600_000)
      const dek = await unwrapZkDek(res.data.wrapped_dek, kek)
      zkKeyManager.setDek(dek)
      zkEnrolled.value = true
      isZkUnlocked.value = true
      return true
    }

    // First-time enrollment: generate random 256-bit DEK client-side, wrap with user KEK, upload opaque bundle
    const saltHex = randomSaltHex(16)
    const iterations = 600_000
    const kek = await deriveClientKek(passphrase, saltHex, iterations)
    const dek = await generateZkDek()
    const wrappedDek = await wrapZkDek(dek, kek)

    await financeApi.saveZkKeyBundle({
      kdf_salt: saltHex,
      kdf_iterations: iterations,
      wrapped_dek: wrappedDek,
      key_version: 1,
    })
    zkKeyManager.setDek(dek)
    zkEnrolled.value = true
    isZkUnlocked.value = true
    return true
  }

  function lockZk() {
    zkKeyManager.lock()
    isZkUnlocked.value = false
  }

  async function encryptFileForUpload(file: File): Promise<File> {
    if (!zkKeyManager.isUnlocked) return file
    const encryptedBytes = await encryptZkBlob(file, zkKeyManager.getDek())
    return new File([encryptedBytes as BlobPart], file.name, { type: 'application/octet-stream' })
  }

  async function decryptDownloadedBlob(data: ArrayBuffer, mimeType: string): Promise<Blob> {
    const view = new Uint8Array(data)
    const isZkBlob =
      view.length >= 6 &&
      view[0] === 0x57 && // W
      view[1] === 0x46 && // F
      view[2] === 0x5a && // Z
      view[3] === 0x4b && // K
      view[4] === 0x30 && // 0
      view[5] === 0x31    // 1
    if (isZkBlob) {
      return decryptZkBlob(data, zkKeyManager.getDek(), mimeType)
    }
    return new Blob([data], { type: mimeType })
  }

  return {
    isZkUnlocked,
    zkEnrolled,
    checkEnrollment,
    enrollOrUnlockZk,
    lockZk,
    encryptFileForUpload,
    decryptDownloadedBlob,
  }
}
