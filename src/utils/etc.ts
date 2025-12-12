// randomize filename by using the hash of the canvas blob
export const generateFilename = async (buf: ArrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  const hash = hashHex.substring(0, 12)
  return hash
}
