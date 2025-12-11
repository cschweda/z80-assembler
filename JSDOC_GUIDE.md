# JSDoc Documentation Guide

This guide documents the JSDoc patterns and conventions used throughout the Z80 Assembler codebase.

## Completed Files with Full JSDoc Documentation

### ✅ Fully Documented
- `src/assembler.js` - Main assembler orchestrator
- `src/constants.js` - Constants and enumerations
- `src/utils/formatter.js` - Output formatting utilities
- `src/ui/examples.js` - Example program management

### 🔄 Remaining Files to Document
- `src/lexer.js` - Tokenizer (261 lines)
- `src/parser.js` - Two-pass parser (922 lines)
- `src/codegen.js` - Code generator (307 lines)
- `src/evaluator.js` - Expression evaluator (162 lines)
- `src/opcodes.js` - Instruction encodings (547 lines)
- `src/main.js` - UI initialization (99 lines)
- `src/tests/test-suite.js` - Test suite (214 lines)
- `src/examples/programs.js` - Example programs (506 lines)

## JSDoc Patterns Used

### 1. File-Level Documentation

Every module starts with a `@fileoverview`:

```javascript
/**
 * @fileoverview Brief description of the module
 * 
 * Detailed explanation of what this module does,
 * its purpose, and how it fits into the larger system.
 * 
 * @module module/path
 * @requires ./dependency
 */
```

### 2. Type Definitions

Complex objects are defined using `@typedef`:

```javascript
/**
 * @typedef {Object} AssemblyResult
 * @property {boolean} success - Whether assembly succeeded
 * @property {Uint8Array} bytes - Generated machine code
 * @property {number} startAddress - Starting address
 * @property {Array<Error>} errors - Errors encountered
 * @property {Array<Warning>} warnings - Warnings generated
 * @property {Object<string, Symbol>} symbolTable - Symbol table
 */
```

### 3. Class Documentation

Classes include description, examples, and constructor docs:

```javascript
/**
 * Z80 Assembler class description
 * 
 * Detailed explanation of class purpose and usage.
 * 
 * @class
 * @example
 * const assembler = new Z80Assembler();
 * const result = assembler.assemble(source);
 */
export class Z80Assembler {
  /**
   * Creates a new instance
   * @param {Object} options - Configuration options
   */
  constructor(options) {
    // ...
  }
}
```

### 4. Function Documentation

Functions include full parameter and return documentation with examples:

```javascript
/**
 * Brief description of what the function does
 * 
 * Detailed explanation including:
 * - Algorithm used
 * - Side effects
 * - Error conditions
 * 
 * @param {string} source - Parameter description
 * @param {Object} options - Options object
 * @param {boolean} options.strict - Option description
 * @returns {ResultType} Description of return value
 * @throws {Error} When invalid input provided
 * 
 * @example
 * const result = functionName('input', { strict: true });
 * console.log(result);
 */
export function functionName(source, options) {
  // ...
}
```

### 5. Constant Documentation

Constants are documented with their purpose and possible values:

```javascript
/**
 * Token type enumeration
 * 
 * Defines all possible token types that the lexer can produce.
 * 
 * @enum {string}
 * @readonly
 */
export const TOKEN = {
  /** Identifier (potential label) */
  LABEL: 'LABEL',
  
  /** Z80 instruction mnemonic */
  MNEMONIC: 'MNEMONIC'
};
```

### 6. Complex Object Properties

Objects with multiple properties are fully documented:

```javascript
/**
 * TRS-80 Model III memory map
 * 
 * Defines the complete memory layout.
 * 
 * @type {Object}
 * @readonly
 * 
 * @property {number} ROM_START - ROM begins at $0000
 * @property {number} ROM_END - ROM ends at $37FF (14KB)
 * @property {number} VIDEO_START - Video RAM at $3C00
 * 
 * @example
 * .ORG $4200
 * LD HL, MEMORY.VIDEO_START
 */
export const MEMORY = {
  ROM_START: 0x0000,
  // ...
};
```

## Template for Remaining Files

### Lexer Template

```javascript
/**
 * @fileoverview Z80 Assembly Lexer - Tokenizes assembly source code
 * 
 * The lexer converts raw assembly source text into a stream of tokens
 * that can be consumed by the parser. Handles all Z80 syntax including
 * labels, mnemonics, registers, numbers (hex/binary/decimal), strings,
 * directives, operators, and comments.
 * 
 * @module lexer
 * @requires ./constants
 */

/**
 * Lexer class - Tokenizes Z80 assembly source code
 * 
 * Performs lexical analysis on assembly source, breaking it into
 * discrete tokens. Handles multiple number formats, string literals,
 * comments, and maintains line/column tracking for error reporting.
 * 
 * @class
 * @example
 * const lexer = new Lexer('LD A, 5\nHALT');
 * const tokens = lexer.tokenize();
 */
export class Lexer {
  /**
   * Creates a new Lexer instance
   * @param {string} source - Assembly source code to tokenize
   */
  constructor(source) {
    // ...
  }

  /**
   * Tokenizes the entire source into an array of tokens
   * 
   * Main entry point for lexical analysis. Scans through source
   * character by character, identifying and creating tokens.
   * 
   * @returns {Array<Token>} Array of token objects
   * @throws {Error} On unexpected characters or syntax errors
   * 
   * @example
   * const tokens = lexer.tokenize();
   * tokens.forEach(t => console.log(t.type, t.value));
   */
  tokenize() {
    // ...
  }
}
```

### Parser Template

```javascript
/**
 * @fileoverview Z80 Assembly Parser - Two-pass parsing with symbol resolution
 * 
 * Implements a two-pass parser that builds a symbol table (pass 1)
 * and generates instruction objects with resolved operands (pass 2).
 * Handles forward references, expressions, and all Z80 addressing modes.
 * 
 * @module parser
 * @requires ./constants
 * @requires ./evaluator
 */

/**
 * Parser class - Converts tokens into instruction objects
 * 
 * Two-pass assembly:
 * - Pass 1: Builds symbol table, calculates instruction sizes
 * - Pass 2: Generates instruction objects with resolved operands
 * 
 * @class
 */
export class Parser {
  /**
   * Parse tokens into instructions
   * 
   * Main entry point. Performs both passes and returns
   * the final parsed result with instructions and symbol table.
   * 
   * @returns {Object} Parse result with instructions and symbols
   * @returns {Array} return.instructions - Array of instruction objects
   * @returns {Object} return.symbolTable - Symbol table with addresses
   * @returns {Array} return.errors - Parse errors
   * @returns {Array} return.warnings - Parse warnings
   */
  parse() {
    // ...
  }
}
```

## Benefits of JSDoc Documentation

1. **IDE Support**: Enables autocomplete, parameter hints, and type checking
2. **Maintainability**: Makes code easier to understand and modify
3. **Documentation Generation**: Can generate HTML docs with JSDoc tool
4. **Type Safety**: Provides TypeScript-like type checking in JavaScript
5. **Onboarding**: Helps new developers understand the codebase
6. **API Clarity**: Clear contracts for function parameters and returns

## Generating HTML Documentation

To generate HTML documentation from JSDoc comments:

```bash
# Install JSDoc
npm install -g jsdoc

# Generate documentation
jsdoc src -r -d docs

# Open in browser
open docs/index.html
```

## Best Practices

1. **Be Detailed**: More documentation is better than less
2. **Include Examples**: Show actual usage patterns
3. **Document Types**: Use @param, @returns, @typedef
4. **Explain Why**: Not just what, but why it works that way
5. **Keep Updated**: Update docs when code changes
6. **Use @private**: Mark internal functions
7. **Link Related**: Use @see to cross-reference
8. **Document Errors**: Use @throws for error conditions

## VSCode Settings

For best JSDoc experience in VSCode, add to `.vscode/settings.json`:

```json
{
  "javascript.suggest.completeJSDocs": true,
  "javascript.suggest.jsdoc.generateReturns": true,
  "editor.quickSuggestions": {
    "other": true,
    "comments": true,
    "strings": true
  }
}
```

This enables automatic JSDoc generation and enhanced IntelliSense.

