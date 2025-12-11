/**
 * Format bytecode as TRS-80 Model III DEBUG-style memory dump
 * @param {Uint8Array} bytes - Machine code bytes
 * @param {number} startAddress - Origin address
 * @returns {string} Formatted hex dump
 */
export function formatMemoryDump(bytes, startAddress) {
  const lines = [];
  
  // Header
  lines.push('ADDR  +0 +1 +2 +3 +4 +5 +6 +7  +8 +9 +A +B +C +D +E +F   ASCII');
  lines.push('----  -- -- -- -- -- -- -- --  -- -- -- -- -- -- -- --   ----------------');
  
  // Round start address down to 16-byte boundary
  const baseAddr = startAddress & 0xFFF0;
  const offset = startAddress - baseAddr;
  
  // Calculate total rows needed
  const totalBytes = offset + bytes.length;
  const rows = Math.ceil(totalBytes / 16);
  
  for (let row = 0; row < rows; row++) {
    const addr = baseAddr + (row * 16);
    let hexPart = '';
    let asciiPart = '';
    
    for (let col = 0; col < 16; col++) {
      const byteIndex = (row * 16) + col - offset;
      
      // Add spacing between byte 7 and 8
      if (col === 8) hexPart += ' ';
      
      if (byteIndex < 0 || byteIndex >= bytes.length) {
        // Outside our data range
        hexPart += '-- ';
        asciiPart += '.';
      } else {
        const byte = bytes[byteIndex];
        hexPart += byte.toString(16).toUpperCase().padStart(2, '0') + ' ';
        
        // ASCII: printable characters only (0x20-0x7E)
        if (byte >= 0x20 && byte <= 0x7E) {
          asciiPart += String.fromCharCode(byte);
        } else {
          asciiPart += '.';
        }
      }
    }
    
    const addrStr = addr.toString(16).toUpperCase().padStart(4, '0');
    lines.push(`${addrStr}  ${hexPart}  ${asciiPart}`);
  }
  
  return lines.join('\n');
}

/**
 * Format symbol table for display
 */
export function formatSymbolTable(symbolTable) {
  const lines = [];
  lines.push('LABEL          ADDR   TYPE');
  lines.push('-------------- ----   -----');
  
  const entries = Object.entries(symbolTable).sort((a, b) => {
    return a[1].address - b[1].address;
  });
  
  for (const [name, entry] of entries) {
    const addrStr = entry.address.toString(16).toUpperCase().padStart(4, '0');
    const paddedName = name.padEnd(14);
    lines.push(`${paddedName} ${addrStr}   ${entry.type}`);
  }
  
  return lines.join('\n');
}

/**
 * Format errors for display
 */
export function formatErrors(errors) {
  if (errors.length === 0) return 'No errors.';
  
  return errors.map(err => {
    const loc = err.column ? `Line ${err.line}, Col ${err.column}` : `Line ${err.line}`;
    return `${loc}: ${err.message}`;
  }).join('\n');
}

/**
 * Format warnings for display
 */
export function formatWarnings(warnings) {
  if (warnings.length === 0) return 'No warnings.';
  
  return warnings.map(warn => {
    const loc = warn.column ? `Line ${warn.line}, Col ${warn.column}` : `Line ${warn.line}`;
    return `${loc}: ${warn.message}`;
  }).join('\n');
}

/**
 * Format bytes as hex string
 */
export function formatBytes(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

