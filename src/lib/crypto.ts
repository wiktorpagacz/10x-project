/**
 * Cryptographic utilities for the application.
 * Provides hashing and other crypto operations.
 */

/**
 * Computes the MD5 hash of a given string.
 * Returns the hash as a hexadecimal string.
 *
 * @param input - The string to hash
 * @returns The MD5 hash as a hex string
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
