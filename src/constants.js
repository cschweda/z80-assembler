/**
 * @fileoverview Constants and enumerations for Z80 assembler
 * 
 * Defines all token types, register encodings, condition codes,
 * memory maps, mnemonics, and directives used throughout the assembler.
 * 
 * @module constants
 */

/**
 * Token type enumeration
 * 
 * Defines all possible token types that the lexer can produce.
 * Used throughout the parser to identify and process different
 * elements of assembly source code.
 * 
 * @enum {string}
 * @readonly
 */
export const TOKEN = {
  /** Identifier (potential label or constant reference) */
  LABEL:      'LABEL',
  
  /** Z80 instruction mnemonic (LD, ADD, etc.) */
  MNEMONIC:   'MNEMONIC',
  
  /** Z80 register name (A, B, HL, etc.) */
  REGISTER:   'REGISTER',
  
  /** Numeric literal (decimal, hex, binary) */
  NUMBER:     'NUMBER',
  
  /** String literal in quotes */
  STRING:     'STRING',
  
  /** Assembler directive (.ORG, .DB, etc.) */
  DIRECTIVE:  'DIRECTIVE',
  
  /** Arithmetic or logical operator (+, -, *, etc.) */
  OPERATOR:   'OPERATOR',
  
  /** Left parenthesis ( */
  LPAREN:     'LPAREN',
  
  /** Right parenthesis ) */
  RPAREN:     'RPAREN',
  
  /** Comma separator */
  COMMA:      'COMMA',
  
  /** Colon (label definition) */
  COLON:      'COLON',
  
  /** End of line */
  NEWLINE:    'NEWLINE',
  
  /** End of file */
  EOF:        'EOF',
  
  /** Comment text (ignored during assembly) */
  COMMENT:    'COMMENT'
};

/**
 * Z80 8-bit register encoding
 * 
 * Maps register names to their 3-bit encoding values used in
 * most Z80 instructions. The encoding follows the Z80 instruction
 * set specification.
 * 
 * @type {Object.<string, number>}
 * @readonly
 * 
 * @example
 * // LD A, B encodes as: 01 111 000 where 111=A, 000=B
 * const destEncoding = REG8['A']; // 7
 * const srcEncoding = REG8['B'];  // 0
 */
export const REG8 = {
  'B': 0,      // 000
  'C': 1,      // 001
  'D': 2,      // 010
  'E': 3,      // 011
  'H': 4,      // 100
  'L': 5,      // 101
  '(HL)': 6,   // 110 - indirect through HL
  'A': 7       // 111 - accumulator
};

/**
 * Z80 16-bit register pair encoding
 * 
 * Maps 16-bit register pair names to their 2-bit encoding values.
 * Used in instructions like LD dd,nn, ADD HL,ss, etc.
 * 
 * @type {Object.<string, number>}
 * @readonly
 * 
 * @example
 * // LD HL, 1234h encodes as: 00 10 0001 nnnn nnnn
 * const regEncoding = REG16['HL']; // 2
 */
export const REG16 = {
  'BC': 0,  // 00 - register pair B and C
  'DE': 1,  // 01 - register pair D and E
  'HL': 2,  // 10 - register pair H and L
  'SP': 3   // 11 - stack pointer
};

/**
 * Stack operation register pair encoding
 * 
 * Similar to REG16 but uses AF (accumulator + flags) instead of SP.
 * Used specifically for PUSH and POP instructions.
 * 
 * @type {Object.<string, number>}
 * @readonly
 * 
 * @example
 * // PUSH AF encodes as: 11 11 0101
 * const regEncoding = STACK_REG['AF']; // 3
 */
export const STACK_REG = {
  'BC': 0,  // 00 - B and C registers
  'DE': 1,  // 01 - D and E registers
  'HL': 2,  // 10 - H and L registers
  'AF': 3   // 11 - accumulator and flags
};

/**
 * Z80 condition code encoding
 * 
 * Maps condition code mnemonics to their 3-bit encoding values.
 * Used in conditional jumps, calls, and returns.
 * 
 * @type {Object.<string, number>}
 * @readonly
 * 
 * @example
 * // JP NZ, label encodes as: 11 000 010
 * const condEncoding = CONDITIONS['NZ']; // 0
 */
export const CONDITIONS = {
  'NZ': 0,  // 000 - not zero
  'Z':  1,  // 001 - zero
  'NC': 2,  // 010 - no carry
  'C':  3,  // 011 - carry
  'PO': 4,  // 100 - parity odd
  'PE': 5,  // 101 - parity even
  'P':  6,  // 110 - positive (sign flag clear)
  'M':  7   // 111 - minus (sign flag set)
};

/**
 * TRS-80 Model III memory map
 * 
 * Defines the complete memory layout specific to the TRS-80 Model III
 * computer. This configuration determines where ROM, keyboard I/O,
 * video RAM, and user RAM are located in the 64KB address space.
 * 
 * Memory Layout:
 * - $0000-$37FF: 14KB ROM (Level II BASIC interpreter)
 * - $3800-$3BFF: 1KB memory-mapped keyboard matrix
 * - $3C00-$3FFF: 1KB video RAM (64×16 character display)
 * - $4000-$7FFF: 16KB user RAM (base configuration)
 * - $4200: Default program start address
 * 
 * @type {Object}
 * @readonly
 * 
 * @property {number} ROM_START - ROM begins at $0000
 * @property {number} ROM_END - ROM ends at $37FF (14KB)
 * @property {number} KEYBOARD_START - Keyboard matrix at $3800
 * @property {number} KEYBOARD_END - Keyboard ends at $3BFF (1KB)
 * @property {number} VIDEO_START - Video RAM at $3C00
 * @property {number} VIDEO_END - Video RAM ends at $3FFF (1KB, 1024 characters)
 * @property {number} RAM_START - User RAM begins at $4000
 * @property {number} RAM_END - User RAM ends at $7FFF (16KB base)
 * @property {number} DEFAULT_ORG - Default program origin at $4200
 * 
 * @example
 * // Initialize video RAM
 * .ORG $4200
 * LD HL, MEMORY.VIDEO_START  ; Point to screen
 * LD (HL), $20               ; Write space character
 */
export const MEMORY = {
  ROM_START:       0x0000,    // ROM begins
  ROM_END:         0x37FF,    // 14KB ROM
  KEYBOARD_START:  0x3800,    // Keyboard matrix
  KEYBOARD_END:    0x3BFF,    // 1KB keyboard area
  VIDEO_START:     0x3C00,    // Video RAM begins
  VIDEO_END:       0x3FFF,    // 1KB video (64×16 = 1024 bytes)
  RAM_START:       0x4000,    // User RAM begins
  RAM_END:         0x7FFF,    // 16KB user RAM (expandable)
  DEFAULT_ORG:     0x4200     // Standard program start
};

/**
 * Z80 instruction mnemonics
 * 
 * Complete set of all valid Z80 instruction mnemonics.
 * Used by the lexer to identify instruction tokens vs. labels.
 * Includes all standard Z80 instructions including undocumented ones.
 * 
 * @type {Set<string>}
 * @readonly
 * 
 * @example
 * if (MNEMONICS.has(token.toUpperCase())) {
 *   return { type: TOKEN.MNEMONIC, value: token };
 * }
 */
export const MNEMONICS = new Set([
  // Arithmetic
  'ADC', 'ADD', 'SBC', 'SUB', 'INC', 'DEC', 'NEG', 'DAA', 'CPL',
  
  // Logical
  'AND', 'OR', 'XOR', 'CP',
  
  // Rotate and shift
  'RLCA', 'RLA', 'RRCA', 'RRA', 'RLC', 'RL', 'RRC', 'RR',
  'SLA', 'SRA', 'SLL', 'SRL', 'RLD', 'RRD',
  
  // Bit operations
  'BIT', 'SET', 'RES',
  
  // Jump and call
  'JP', 'JR', 'DJNZ', 'CALL', 'RET', 'RETI', 'RETN', 'RST',
  
  // Load
  'LD', 'PUSH', 'POP', 'EX', 'EXX',
  
  // Block operations
  'LDI', 'LDIR', 'LDD', 'LDDR',
  'CPI', 'CPIR', 'CPD', 'CPDR',
  'INI', 'INIR', 'IND', 'INDR',
  'OUTI', 'OTIR', 'OUTD', 'OTDR',
  
  // I/O
  'IN', 'OUT',
  
  // Control
  'NOP', 'HALT', 'DI', 'EI', 'IM', 'SCF', 'CCF'
]);

/**
 * Z80 register names
 * 
 * Complete set of all valid Z80 register names including 8-bit,
 * 16-bit, index registers, and special registers.
 * Used by the lexer to identify register tokens.
 * 
 * @type {Set<string>}
 * @readonly
 * 
 * @example
 * if (REGISTERS.has(token.toUpperCase())) {
 *   return { type: TOKEN.REGISTER, value: token };
 * }
 */
export const REGISTERS = new Set([
  // 8-bit registers
  'A', 'B', 'C', 'D', 'E', 'H', 'L',
  
  // 16-bit register pairs
  'AF', 'BC', 'DE', 'HL', 'SP', 'PC',
  
  // Index registers
  'IX', 'IY',
  
  // Index register halves (undocumented)
  'IXH', 'IXL', 'IYH', 'IYL',
  
  // Special registers
  'I',    // Interrupt vector
  'R',    // Memory refresh
  "AF'"   // Alternate AF register pair
]);

/**
 * Assembler directives
 * 
 * Set of all valid assembler directives that control assembly behavior.
 * Includes both dotted (.ORG) and non-dotted (ORG) forms, plus common
 * aliases used in various assemblers.
 * 
 * Supported directives:
 * - .ORG/.org: Set origin address
 * - .DB/.db/DEFB: Define byte(s)
 * - .DW/.dw/DEFW: Define word(s) - 16-bit little-endian
 * - .DS/.ds/DEFS: Define space - reserve bytes
 * - .EQU/.equ: Define constant (immutable)
 * - .DEFL/.defl: Define label (mutable)
 * - .END/.end: End of source (optional)
 * 
 * @type {Set<string>}
 * @readonly
 * 
 * @example
 * if (DIRECTIVES.has(token.toUpperCase())) {
 *   return { type: TOKEN.DIRECTIVE, value: token };
 * }
 */
export const DIRECTIVES = new Set([
  // Standard forms with dot prefix
  '.ORG', '.DB', '.DW', '.EQU', '.DEFL', '.END', '.DS',
  
  // Forms without dot prefix
  'ORG', 'DB', 'DW', 'EQU', 'DEFL', 'END', 'DS',
  
  // Common aliases
  'DEFB',  // Define byte (same as .DB)
  'DEFW',  // Define word (same as .DW)
  'DEFM',  // Define message (same as .DB with string)
  'DEFS'   // Define space (same as .DS)
]);

