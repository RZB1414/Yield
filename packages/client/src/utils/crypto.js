// Utilitários para conversão de buffer <-> hex

function bufferToHex(ab) {
  const bytes = new Uint8Array(ab);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

export { bufferToHex, hexToBuffer };