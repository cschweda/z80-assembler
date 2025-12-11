/**
 * @fileoverview Output formatting utilities for Z80 assembler
 * 
 * Provides functions to format assembly output in TRS-80 Model III
 * DEBUG-style format, including memory dumps, symbol tables, and
 * error/warning messages.
 * 
 * @module utils/formatter
 */

/**
 * Formats bytecode as TRS-80 Model III DEBUG-style memory dump
 * 
 * Creates a hexadecimal memory dump with 16 bytes per line, showing
 * both hex values and ASCII representation. Mimics the output format
 * of the TRS-80 Model III DEBUG command for authenticity.
 * 
 * Format:
 * ```
 * ADDR  +0 +1 +2 +3 +4 +5 +6 +7  +8 +9 +A +B +C +D +E +F   ASCII
 * 4200  3E 05 76 -- -- -- -- --  -- -- -- -- -- -- -- --   >.v.............
 * ```
 * 
 * @param {Uint8Array} bytes - Machine code bytes to display
 * @param {number} startAddress - Origin address where code begins
 * @returns {string} Multi-line formatted hex dump with ASCII
 * 
 * @example
 * const bytes = new Uint8Array([0x3E, 0x05, 0x76]);
 * const dump = formatMemoryDump(bytes, 0x4200);
 * console.log(dump);
 * // Outputs TRS-80 style hex dump starting at $4200
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
 * Formats symbol table for display
 * 
 * Creates a sorted table of all symbols (labels, constants) with their
 * addresses and types. Symbols are sorted by address in ascending order.
 * 
 * Format:
 * ```
 * LABEL          ADDR   TYPE
 * -------------- ----   -----
 * START          4200   LABEL
 * VRAM           3C00   EQU
 * RESULT         4209   LABEL
 * ```
 * 
 * @param {Object.<string, {address: number, type: string}>} symbolTable - Symbol table from assembler
 * @returns {string} Multi-line formatted symbol table
 * 
 * @example
 * const symbols = {
 *   START: { address: 0x4200, type: 'LABEL' },
 *   VRAM: { address: 0x3C00, type: 'EQU' }
 * };
 * console.log(formatSymbolTable(symbols));
 */
export function formatSymbolTable(symbolTable) {
  const lines = [];
  
  // Header
  lines.push('LABEL          ADDR   TYPE');
  lines.push('-------------- ----   -----');
  
  // Sort entries by address (ascending)
  const entries = Object.entries(symbolTable).sort((a, b) => {
    return a[1].address - b[1].address;
  });
  
  // Format each entry
  for (const [name, entry] of entries) {
    const addrStr = entry.address.toString(16).toUpperCase().padStart(4, '0');
    const paddedName = name.padEnd(14);
    lines.push(`${paddedName} ${addrStr}   ${entry.type}`);
  }
  
  return lines.join('\n');
}

/**
 * Formats errors for display
 * 
 * Converts error objects into human-readable error messages with
 * line and column information.
 * 
 * @param {Array<{message: string, line: number, column?: number}>} errors - Array of error objects
 * @returns {string} Formatted error messages, one per line
 * 
 * @example
 * const errors = [
 *   { message: 'Undefined symbol: LABEL', line: 5, column: 10 },
 *   { message: 'Invalid opcode', line: 7 }
 * ];
 * console.log(formatErrors(errors));
 * // Line 5, Col 10: Undefined symbol: LABEL
 * // Line 7: Invalid opcode
 */
export function formatErrors(errors) {
  if (errors.length === 0) return 'No errors.';
  
  return errors.map(err => {
    const loc = err.column ? `Line ${err.line}, Col ${err.column}` : `Line ${err.line}`;
    return `${loc}: ${err.message}`;
  }).join('\n');
}

/**
 * Formats warnings for display
 * 
 * Converts warning objects into human-readable warning messages with
 * line and column information. Similar to formatErrors but for warnings.
 * 
 * @param {Array<{message: string, line: number, column?: number}>} warnings - Array of warning objects
 * @returns {string} Formatted warning messages, one per line
 * 
 * @example
 * const warnings = [
 *   { message: 'Symbol redefined', line: 10, column: 1 }
 * ];
 * console.log(formatWarnings(warnings));
 * // Line 10, Col 1: Symbol redefined
 */
export function formatWarnings(warnings) {
  if (warnings.length === 0) return 'No warnings.';
  
  return warnings.map(warn => {
    const loc = warn.column ? `Line ${warn.line}, Col ${warn.column}` : `Line ${warn.line}`;
    return `${loc}: ${warn.message}`;
  }).join('\n');
}

/**
 * Formats byte array as space-separated hex string
 * 
 * Converts a byte array into a readable hexadecimal string with
 * spaces between each byte. Useful for displaying bytecode sequences.
 * 
 * @param {Uint8Array|Array<number>} bytes - Array of byte values (0-255)
 * @returns {string} Space-separated hex string (e.g., "3E 05 76")
 * 
 * @example
 * const bytes = new Uint8Array([0x3E, 0x05, 0x76]);
 * console.log(formatBytes(bytes));  // "3E 05 76"
 * 
 * @example
 * const instruction = [0xCD, 0x00, 0x42];
 * console.log(formatBytes(instruction));  // "CD 00 42"
 */
export function formatBytes(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

