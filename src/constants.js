// Token types
export const TOKEN = {
  LABEL:      'LABEL',
  MNEMONIC:   'MNEMONIC',
  REGISTER:   'REGISTER',
  NUMBER:     'NUMBER',
  STRING:     'STRING',
  DIRECTIVE:  'DIRECTIVE',
  OPERATOR:   'OPERATOR',
  LPAREN:     'LPAREN',
  RPAREN:     'RPAREN',
  COMMA:      'COMMA',
  COLON:      'COLON',
  NEWLINE:    'NEWLINE',
  EOF:        'EOF',
  COMMENT:    'COMMENT'
};

// Z80 8-bit registers and their encoding bits
export const REG8 = {
  'B': 0, 'C': 1, 'D': 2, 'E': 3,
  'H': 4, 'L': 5, '(HL)': 6, 'A': 7
};

// Z80 16-bit register pairs
export const REG16 = {
  'BC': 0, 'DE': 1, 'HL': 2, 'SP': 3
};

// Stack register pairs (AF instead of SP)
export const STACK_REG = {
  'BC': 0, 'DE': 1, 'HL': 2, 'AF': 3
};

// Condition codes and their encoding bits
export const CONDITIONS = {
  'NZ': 0, 'Z': 1, 'NC': 2, 'C': 3,
  'PO': 4, 'PE': 5, 'P': 6, 'M': 7
};

// TRS-80 Model III memory map
// Model III specific memory layout:
// - ROM: 14KB at $0000-$37FF (Model III ROM)
// - Keyboard: 1KB memory-mapped I/O at $3800-$3BFF
// - Video RAM: 1KB at $3C00-$3FFF (64 cols × 16 rows = 1024 bytes)
// - User RAM: 16KB at $4000-$7FFF (expandable to 48KB)
// - Default origin: $4200 (standard user program start address for Model III)
export const MEMORY = {
  ROM_START:       0x0000,
  ROM_END:         0x37FF,
  KEYBOARD_START:  0x3800,
  KEYBOARD_END:    0x3BFF,
  VIDEO_START:     0x3C00,
  VIDEO_END:       0x3FFF,
  RAM_START:       0x4000,
  RAM_END:         0x7FFF,
  DEFAULT_ORG:     0x4200
};

// All Z80 mnemonics (for lexer recognition)
export const MNEMONICS = new Set([
  'ADC', 'ADD', 'AND', 'BIT', 'CALL', 'CCF', 'CP', 'CPD', 'CPDR', 'CPI',
  'CPIR', 'CPL', 'DAA', 'DEC', 'DI', 'DJNZ', 'EI', 'EX', 'EXX', 'HALT',
  'IM', 'IN', 'INC', 'IND', 'INDR', 'INI', 'INIR', 'JP', 'JR', 'LD',
  'LDD', 'LDDR', 'LDI', 'LDIR', 'NEG', 'NOP', 'OR', 'OTDR', 'OTIR',
  'OUT', 'OUTD', 'OUTI', 'POP', 'PUSH', 'RES', 'RET', 'RETI', 'RETN',
  'RL', 'RLA', 'RLC', 'RLCA', 'RLD', 'RR', 'RRA', 'RRC', 'RRCA', 'RRD',
  'RST', 'SBC', 'SCF', 'SET', 'SLA', 'SLL', 'SRA', 'SRL', 'SUB', 'XOR'
]);

// All registers (for lexer recognition)
export const REGISTERS = new Set([
  'A', 'B', 'C', 'D', 'E', 'H', 'L',
  'AF', 'BC', 'DE', 'HL', 'SP', 'PC',
  'IX', 'IY', 'IXH', 'IXL', 'IYH', 'IYL',
  'I', 'R', "AF'"
]);

// Assembler directives
export const DIRECTIVES = new Set([
  '.ORG', '.DB', '.DW', '.EQU', '.DEFL', '.END', '.DS',
  'ORG', 'DB', 'DW', 'EQU', 'DEFL', 'END', 'DS',        // without dot prefix
  'DEFB', 'DEFW', 'DEFM', 'DEFS'                         // common aliases
]);

