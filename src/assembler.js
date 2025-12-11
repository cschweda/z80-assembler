/**
 * @fileoverview Z80 Assembler - Main orchestrator for the assembly process
 * 
 * This module provides the main Z80Assembler class that coordinates the
 * lexer, parser, and code generator to convert Z80 assembly source code
 * into executable machine code bytecode.
 * 
 * @module assembler
 * @requires ./lexer
 * @requires ./parser
 * @requires ./codegen
 * @requires ./constants
 */

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { CodeGenerator } from './codegen.js';
import { MEMORY } from './constants.js';

/**
 * @typedef {Object} AssemblyError
 * @property {string} message - Error message
 * @property {number} line - Line number where error occurred
 * @property {number} column - Column number where error occurred
 */

/**
 * @typedef {Object} AssemblyWarning
 * @property {string} message - Warning message
 * @property {number} line - Line number where warning occurred
 * @property {number} column - Column number where warning occurred
 */

/**
 * @typedef {Object} Symbol
 * @property {number} address - Address or value of the symbol
 * @property {string} type - Type of symbol ('LABEL', 'EQU', 'DEFL')
 */

/**
 * @typedef {Object} AssemblyResult
 * @property {boolean} success - Whether assembly succeeded without errors
 * @property {Uint8Array} bytes - Generated machine code bytes
 * @property {number} startAddress - Starting address of the program
 * @property {AssemblyError[]} errors - Array of errors encountered
 * @property {AssemblyWarning[]} warnings - Array of warnings generated
 * @property {Object.<string, Symbol>} symbolTable - Symbol table with label addresses
 * @property {Array} [instructions] - Generated instruction objects (if successful)
 */

/**
 * Z80 Assembler class - Converts Z80 assembly source code to machine code
 * 
 * This is the main entry point for the assembler. It orchestrates the
 * three-stage assembly process:
 * 1. Lexical analysis (tokenization)
 * 2. Parsing (two-pass symbol resolution)
 * 3. Code generation (bytecode emission)
 * 
 * @class
 * @example
 * const assembler = new Z80Assembler();
 * const result = assembler.assemble(`
 *   .ORG $4200
 *   START: LD A, 5
 *          HALT
 *   .END
 * `);
 * 
 * if (result.success) {
 *   console.log('Bytecode:', Array.from(result.bytes));
 *   console.log('Symbols:', result.symbolTable);
 * }
 */
export class Z80Assembler {
  /**
   * Creates a new Z80Assembler instance
   * Initializes error and warning arrays
   */
  constructor() {
    this.reset();
  }

  /**
   * Resets the assembler state
   * Clears all errors and warnings from previous assembly runs
   * 
   * @private
   */
  reset() {
    /** @type {AssemblyError[]} */
    this.errors = [];
    
    /** @type {AssemblyWarning[]} */
    this.warnings = [];
  }

  /**
   * Assembles Z80 source code into machine code
   * 
   * Performs a complete assembly process:
   * 1. Validates input
   * 2. Tokenizes source with Lexer
   * 3. Parses tokens with two-pass Parser
   * 4. Generates bytecode with CodeGenerator
   * 5. Returns comprehensive results
   * 
   * @param {string} source - Z80 assembly source code
   * @returns {AssemblyResult} Complete assembly result with bytecode and metadata
   * 
   * @example
   * const result = assembler.assemble('LD A, 5\\nHALT');
   * if (result.success) {
   *   console.log('Generated', result.bytes.length, 'bytes');
   * } else {
   *   result.errors.forEach(err => console.error(err.message));
   * }
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

  /**
   * Assembles instruction objects into a contiguous byte array
   * 
   * Takes the generated instruction objects from the code generator
   * and combines all their bytecode into a single Uint8Array suitable
   * for execution or output.
   * 
   * @private
   * @param {Array<Object>} instructions - Array of instruction objects with bytes property
   * @returns {Uint8Array} Combined bytecode array
   * 
   * @example
   * // instructions = [{bytes: [0x3E, 0x05]}, {bytes: [0x76]}]
   * // Returns: Uint8Array([0x3E, 0x05, 0x76])
   */
  assembleBytes(instructions) {
    // Calculate total size needed
    let totalSize = 0;
    instructions.forEach(inst => {
      totalSize += inst.bytes.length;
    });

    // Allocate byte array
    const bytes = new Uint8Array(totalSize);
    let offset = 0;

    // Copy all instruction bytes into the array
    instructions.forEach(inst => {
      for (const byte of inst.bytes) {
        bytes[offset++] = byte & 0xFF; // Ensure 8-bit values
      }
    });

    return bytes;
  }

  /**
   * Creates a failed assembly result
   * 
   * Used when assembly fails due to validation errors or internal errors.
   * Returns a standardized error result object.
   * 
   * @private
   * @param {string} message - Error message describing the failure
   * @returns {AssemblyResult} Failed assembly result with error
   * 
   * @example
   * return this.failResult('Source must be a string');
   */
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

