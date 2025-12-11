import { REG8, REG16, STACK_REG, CONDITIONS } from './constants.js';

/**
 * Instruction definitions
 * 
 * Each entry maps a pattern to encoding info:
 * - opcode: base opcode byte(s)
 * - prefix: optional prefix byte (0xCB, 0xDD, 0xED, 0xFD)
 * - operands: array describing expected operands
 * - size: total bytes including operands
 * - cycles: T-states (can be array for conditional instructions)
 */

// Simple single-byte instructions
export const SIMPLE_INSTRUCTIONS = {
  'NOP': { opcode: 0x00, size: 1, cycles: 4 },
  'HALT': { opcode: 0x76, size: 1, cycles: 4 },
  'DI': { opcode: 0xF3, size: 1, cycles: 4 },
  'EI': { opcode: 0xFB, size: 1, cycles: 4 },
  'EXX': { opcode: 0xD9, size: 1, cycles: 4 },
  'SCF': { opcode: 0x37, size: 1, cycles: 4 },
  'CCF': { opcode: 0x3F, size: 1, cycles: 4 },
  'CPL': { opcode: 0x2F, size: 1, cycles: 4 },
  'DAA': { opcode: 0x27, size: 1, cycles: 4 },
  'RLCA': { opcode: 0x07, size: 1, cycles: 4 },
  'RRCA': { opcode: 0x0F, size: 1, cycles: 4 },
  'RLA': { opcode: 0x17, size: 1, cycles: 4 },
  'RRA': { opcode: 0x1F, size: 1, cycles: 4 },
  'RET': { opcode: 0xC9, size: 1, cycles: 10 },
  'RETI': { prefix: 0xED, opcode: 0x4D, size: 2, cycles: 14 },
  'RETN': { prefix: 0xED, opcode: 0x45, size: 2, cycles: 14 },
  'NEG': { prefix: 0xED, opcode: 0x44, size: 2, cycles: 8 },
  'EX DE,HL': { opcode: 0xEB, size: 1, cycles: 4 },
  "EX AF,AF'": { opcode: 0x08, size: 1, cycles: 4 },
  'EX (SP),HL': { opcode: 0xE3, size: 1, cycles: 19 },
  'LDI': { prefix: 0xED, opcode: 0xA0, size: 2, cycles: 16 },
  'LDIR': { prefix: 0xED, opcode: 0xB0, size: 2, cycles: [21, 16] },
  'LDD': { prefix: 0xED, opcode: 0xA8, size: 2, cycles: 16 },
  'LDDR': { prefix: 0xED, opcode: 0xB8, size: 2, cycles: [21, 16] },
};

/**
 * LD instruction patterns - these are complex and need special handling
 */
export function encodeLD(operands) {
  const [dest, src] = operands;

  // LD r, r' - register to register
  if (REG8[dest] !== undefined && REG8[src] !== undefined) {
    return {
      bytes: [0x40 | (REG8[dest] << 3) | REG8[src]],
      size: 1
    };
  }

  // LD r, n - immediate to register
  if (REG8[dest] !== undefined && typeof src === 'number') {
    return {
      bytes: [0x06 | (REG8[dest] << 3), src & 0xFF],
      size: 2
    };
  }

  // LD r, (HL) - indirect to register
  if (REG8[dest] !== undefined && src === '(HL)') {
    return {
      bytes: [0x46 | (REG8[dest] << 3)],
      size: 1
    };
  }

  // LD (HL), r - register to indirect
  if (dest === '(HL)' && REG8[src] !== undefined) {
    return {
      bytes: [0x70 | REG8[src]],
      size: 1
    };
  }

  // LD (HL), n - immediate to indirect
  if (dest === '(HL)' && typeof src === 'number') {
    return {
      bytes: [0x36, src & 0xFF],
      size: 2
    };
  }

  // LD A, (BC)
  if (dest === 'A' && src === '(BC)') {
    return { bytes: [0x0A], size: 1 };
  }

  // LD A, (DE)
  if (dest === 'A' && src === '(DE)') {
    return { bytes: [0x1A], size: 1 };
  }

  // LD A, (nn) - extended addressing
  // Handle both number addresses and label reference objects
  if (dest === 'A') {
    if (typeof src === 'number' && src > 255) {
      return {
        bytes: [0x3A, src & 0xFF, (src >> 8) & 0xFF],
        size: 3
      };
    }
    if (src && typeof src === 'object' && src.type === 'LABEL_REF') {
      // This will be resolved in codegen, but for now check if it's an address
      const addr = src.address;
      if (addr > 255) {
        return {
          bytes: [0x3A, addr & 0xFF, (addr >> 8) & 0xFF],
          size: 3
        };
      }
    }
    // LD A, n - 8-bit immediate
    if (typeof src === 'number' && src <= 255) {
      return {
        bytes: [0x3E, src & 0xFF],
        size: 2
      };
    }
  }

  // LD (BC), A
  if (dest === '(BC)' && src === 'A') {
    return { bytes: [0x02], size: 1 };
  }

  // LD (DE), A
  if (dest === '(DE)' && src === 'A') {
    return { bytes: [0x12], size: 1 };
  }

  // LD (nn), A
  // dest should be a number (address) - label references are resolved in codegen
  if (typeof dest === 'number' && src === 'A') {
    // Indirect addressing (nn) passed as number
    return {
      bytes: [0x32, dest & 0xFF, (dest >> 8) & 0xFF],
      size: 3
    };
  }

  // LD dd, nn - 16-bit immediate load
  // This matches any 16-bit register with a number
  if (REG16[dest] !== undefined && typeof src === 'number') {
    return {
      bytes: [0x01 | (REG16[dest] << 4), src & 0xFF, (src >> 8) & 0xFF],
      size: 3
    };
  }

  // LD SP, HL
  if (dest === 'SP' && src === 'HL') {
    return { bytes: [0xF9], size: 1 };
  }

  // LD (nn), HL
  if ((typeof dest === 'number' || (dest && typeof dest === 'object' && dest.type === 'LABEL_REF')) && src === 'HL') {
    const addr = typeof dest === 'number' ? dest : (dest.address || 0);
    return {
      bytes: [0x22, addr & 0xFF, (addr >> 8) & 0xFF],
      size: 3
    };
  }

  // LD HL, (nn)
  if (dest === 'HL' && (typeof src === 'number' || (src && typeof src === 'object' && src.type === 'LABEL_REF'))) {
    const addr = typeof src === 'number' ? src : (src.address || 0);
    return {
      bytes: [0x2A, addr & 0xFF, (addr >> 8) & 0xFF],
      size: 3
    };
  }

  throw new Error(`Unsupported LD pattern: ${dest}, ${src}`);
}

/**
 * JP instruction patterns
 */
export function encodeJP(operands) {
  if (operands.length === 1) {
    const target = operands[0];

    // JP (HL)
    if (target === '(HL)') {
      return { bytes: [0xE9], size: 1, cycles: 4 };
    }

    // JP nn - unconditional jump
    if (typeof target === 'number') {
      return {
        bytes: [0xC3, target & 0xFF, (target >> 8) & 0xFF],
        size: 3,
        cycles: 10
      };
    }
  }

  // JP cc, nn - conditional jump
  if (operands.length === 2) {
    const [cc, target] = operands;
    if (CONDITIONS[cc] !== undefined && typeof target === 'number') {
      return {
        bytes: [0xC2 | (CONDITIONS[cc] << 3), target & 0xFF, (target >> 8) & 0xFF],
        size: 3,
        cycles: 10
      };
    }
  }

  throw new Error(`Unsupported JP pattern: ${operands.join(', ')}`);
}

/**
 * JR instruction patterns (relative jumps)
 */
export function encodeJR(operands) {
  if (operands.length === 1) {
    const offset = operands[0];
    if (typeof offset === 'number') {
      // Offset is already calculated relative to instruction end
      // Convert to signed 8-bit
      const relOffset = offset < 0 ? (0x100 + offset) : offset;
      return {
        bytes: [0x18, relOffset & 0xFF],
        size: 2,
        cycles: 12
      };
    }
  }

  // JR cc, e - conditional relative
  if (operands.length === 2) {
    const [cc, offset] = operands;
    if (typeof offset === 'number') {
      const relOffset = offset < 0 ? (0x100 + offset) : offset;
      const opcodes = {
        'NZ': 0x20, 'Z': 0x28, 'NC': 0x30, 'C': 0x38
      };
      if (opcodes[cc] !== undefined) {
        return {
          bytes: [opcodes[cc], relOffset & 0xFF],
          size: 2,
          cycles: [12, 7]
        };
      }
    }
  }

  throw new Error(`Unsupported JR pattern: ${operands.join(', ')}`);
}

/**
 * DJNZ instruction
 */
export function encodeDJNZ(offset) {
  if (typeof offset === 'number') {
    // Offset is already calculated relative to instruction end
    const relOffset = offset < 0 ? (0x100 + offset) : offset;
    return {
      bytes: [0x10, relOffset & 0xFF],
      size: 2,
      cycles: [13, 8]
    };
  }
  throw new Error(`Invalid DJNZ offset: ${offset}`);
}

/**
 * Arithmetic/Logic operations
 */
export const ALU_OPCODES = {
  'ADD': 0x80, 'ADC': 0x88, 'SUB': 0x90, 'SBC': 0x98,
  'AND': 0xA0, 'XOR': 0xA8, 'OR':  0xB0, 'CP':  0xB8
};

export const ALU_IMM_OPCODES = {
  'ADD': 0xC6, 'ADC': 0xCE, 'SUB': 0xD6, 'SBC': 0xDE,
  'AND': 0xE6, 'XOR': 0xEE, 'OR':  0xF6, 'CP':  0xFE
};

export function encodeALU(mnemonic, operands) {
  if (operands.length === 1) {
    const op = operands[0];

    // ALU A, r
    if (REG8[op] !== undefined) {
      return {
        bytes: [ALU_OPCODES[mnemonic] | REG8[op]],
        size: 1
      };
    }

    // ALU A, (HL)
    if (op === '(HL)') {
      return {
        bytes: [ALU_OPCODES[mnemonic] | 6],
        size: 1
      };
    }

    // ALU A, n - immediate
    if (typeof op === 'number') {
      return {
        bytes: [ALU_IMM_OPCODES[mnemonic], op & 0xFF],
        size: 2
      };
    }
  }

  // ALU A, r (explicit A operand)
  if (operands.length === 2 && operands[0] === 'A') {
    return encodeALU(mnemonic, [operands[1]]);
  }

  throw new Error(`Unsupported ${mnemonic} pattern: ${operands.join(', ')}`);
}

/**
 * ADD HL,ss - 16-bit addition
 */
export function encodeADDHL(operands) {
  if (operands.length === 2 && operands[0] === 'HL' && REG16[operands[1]] !== undefined) {
    return {
      bytes: [0x09 | (REG16[operands[1]] << 4)],
      size: 1
    };
  }
  throw new Error(`Unsupported ADD HL pattern: ${operands.join(', ')}`);
}

/**
 * INC/DEC patterns
 */
export function encodeINC(operand) {
  // 8-bit INC r
  if (REG8[operand] !== undefined) {
    return {
      bytes: [0x04 | (REG8[operand] << 3)],
      size: 1
    };
  }

  // INC (HL)
  if (operand === '(HL)') {
    return { bytes: [0x34], size: 1 };
  }

  // 16-bit INC rr
  if (REG16[operand] !== undefined) {
    return {
      bytes: [0x03 | (REG16[operand] << 4)],
      size: 1
    };
  }

  throw new Error(`Unsupported INC operand: ${operand}`);
}

export function encodeDEC(operand) {
  // 8-bit DEC r
  if (REG8[operand] !== undefined) {
    return {
      bytes: [0x05 | (REG8[operand] << 3)],
      size: 1
    };
  }

  // DEC (HL)
  if (operand === '(HL)') {
    return { bytes: [0x35], size: 1 };
  }

  // 16-bit DEC rr
  if (REG16[operand] !== undefined) {
    return {
      bytes: [0x0B | (REG16[operand] << 4)],
      size: 1
    };
  }

  throw new Error(`Unsupported DEC operand: ${operand}`);
}

/**
 * PUSH/POP patterns
 */
export function encodePUSH(operand) {
  if (STACK_REG[operand] !== undefined) {
    return {
      bytes: [0xC5 | (STACK_REG[operand] << 4)],
      size: 1
    };
  }
  throw new Error(`Unsupported PUSH operand: ${operand}`);
}

export function encodePOP(operand) {
  if (STACK_REG[operand] !== undefined) {
    return {
      bytes: [0xC1 | (STACK_REG[operand] << 4)],
      size: 1
    };
  }
  throw new Error(`Unsupported POP operand: ${operand}`);
}

/**
 * CALL patterns
 */
export function encodeCALL(operands) {
  if (operands.length === 1) {
    const target = operands[0];
    if (typeof target === 'number') {
      return {
        bytes: [0xCD, target & 0xFF, (target >> 8) & 0xFF],
        size: 3
      };
    }
  }

  // CALL cc, nn
  if (operands.length === 2) {
    const [cc, target] = operands;
    if (CONDITIONS[cc] !== undefined && typeof target === 'number') {
      return {
        bytes: [0xC4 | (CONDITIONS[cc] << 3), target & 0xFF, (target >> 8) & 0xFF],
        size: 3
      };
    }
  }

  throw new Error(`Unsupported CALL pattern: ${operands.join(', ')}`);
}

/**
 * RET cc patterns
 */
export function encodeRETCC(cc) {
  if (CONDITIONS[cc] !== undefined) {
    return {
      bytes: [0xC0 | (CONDITIONS[cc] << 3)],
      size: 1
    };
  }
  throw new Error(`Unsupported RET condition: ${cc}`);
}

/**
 * RST patterns (restart)
 */
export function encodeRST(addr) {
  if (typeof addr === 'number' && (addr & 0x38) === addr && addr >= 0 && addr <= 0x38) {
    return {
      bytes: [0xC7 | (addr & 0x38)],
      size: 1
    };
  }
  throw new Error(`Invalid RST address: ${addr}`);
}

/**
 * CB-prefixed instructions (rotate/shift/bit)
 */
export const CB_INSTRUCTIONS = {
  'RLC':  0x00, 'RRC':  0x08, 'RL':   0x10, 'RR':   0x18,
  'SLA':  0x20, 'SRA':  0x28, 'SLL':  0x30, 'SRL':  0x38,
  'BIT':  0x40, 'RES':  0x80, 'SET':  0xC0
};

export function encodeCB(mnemonic, operands) {
  if (mnemonic === 'BIT' || mnemonic === 'SET' || mnemonic === 'RES') {
    // BIT/SET/RES b, r or BIT/SET/RES b, (HL)
    if (operands.length === 2) {
      const [bit, reg] = operands;
      if (typeof bit === 'number' && bit >= 0 && bit <= 7) {
        if (reg === '(HL)') {
          return {
            bytes: [0xCB, CB_INSTRUCTIONS[mnemonic] | (bit << 3) | 6],
            size: 2
          };
        }
        if (REG8[reg] !== undefined) {
          return {
            bytes: [0xCB, CB_INSTRUCTIONS[mnemonic] | (bit << 3) | REG8[reg]],
            size: 2
          };
        }
      }
    }
  } else {
    // RLC/RRC/RL/RR/SLA/SRA/SLL/SRL r or (HL)
    if (operands.length === 1) {
      const reg = operands[0];
      if (reg === '(HL)') {
        return {
          bytes: [0xCB, CB_INSTRUCTIONS[mnemonic] | 6],
          size: 2
        };
      }
      if (REG8[reg] !== undefined) {
        return {
          bytes: [0xCB, CB_INSTRUCTIONS[mnemonic] | REG8[reg]],
          size: 2
        };
      }
    }
  }

  throw new Error(`Unsupported CB instruction: ${mnemonic} ${operands.join(', ')}`);
}

/**
 * IN/OUT instructions
 */
export function encodeIN(operands) {
  // IN A, (n)
  if (operands.length === 2 && operands[0] === 'A') {
    const port = operands[1];
    if (typeof port === 'number') {
      return {
        bytes: [0xDB, port & 0xFF],
        size: 2
      };
    }
  }
  throw new Error(`Unsupported IN pattern: ${operands.join(', ')}`);
}

export function encodeOUT(operands) {
  // OUT (n), A
  if (operands.length === 2 && operands[1] === 'A') {
    const port = operands[0];
    if (typeof port === 'number') {
      return {
        bytes: [0xD3, port & 0xFF],
        size: 2
      };
    }
  }
  throw new Error(`Unsupported OUT pattern: ${operands.join(', ')}`);
}

