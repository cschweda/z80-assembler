import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { CodeGenerator } from './codegen.js';
import { MEMORY } from './constants.js';

export class Z80Assembler {
  constructor() {
    this.reset();
  }

  reset() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Assemble Z80 source code into machine code
   * @param {string} source - Assembly source code
   * @returns {object} AssemblyResult
   */
  assemble(source) {
    this.reset();

    if (typeof source !== 'string') {
      return this.failResult('Source must be a string');
    }

    if (source.trim().length === 0) {
      return this.failResult('Empty source');
    }

    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      const lexerErrors = tokens.filter(t => t.type === 'ERROR');
      lexerErrors.forEach(e => {
        this.errors.push({
          message: `Unexpected character: ${e.value}`,
          line: e.line,
          column: e.column
        });
      });

      const parser = new Parser(tokens);
      const result = parser.parse();

      this.errors.push(...result.errors);
      this.warnings.push(...result.warnings);

      // Generate bytecode
      // Pass the symbol table by reference so codegen can update addresses
      const codegen = new CodeGenerator(result.symbolTable, result.startAddress);
      const instructions = codegen.generate(result.instructions);

      const bytes = this.assembleBytes(instructions);

      return {
        success: this.errors.length === 0,
        bytes: bytes,
        startAddress: result.startAddress,
        errors: this.errors,
        warnings: this.warnings,
        symbolTable: codegen.symbolTable, // Use updated symbol table from codegen
        instructions: instructions // Include generated instructions
      };

    } catch (e) {
      return this.failResult(`Internal assembler error: ${e.message}`);
    }
  }

  assembleBytes(instructions) {
    let totalSize = 0;
    instructions.forEach(inst => {
      totalSize += inst.bytes.length;
    });

    const bytes = new Uint8Array(totalSize);
    let offset = 0;

    instructions.forEach(inst => {
      for (const byte of inst.bytes) {
        bytes[offset++] = byte & 0xFF;
      }
    });

    return bytes;
  }

  failResult(message) {
    return {
      success: false,
      bytes: new Uint8Array(0),
      startAddress: MEMORY.DEFAULT_ORG,
      errors: [{ message, line: 1, column: 1 }],
      warnings: [],
      symbolTable: {}
    };
  }
}

