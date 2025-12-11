/**
 * @fileoverview Expression evaluator for assembly-time arithmetic
 * 
 * Implements a recursive descent parser that evaluates arithmetic expressions
 * in Z80 assembly source code. Supports standard operators, parentheses,
 * label references, and the current address symbol ($).
 * 
 * Grammar (operator precedence):
 * ```
 * expression  := additive
 * additive    := multiplicative (('+' | '-') multiplicative)*
 * multiplicative := unary (('*' | '/') unary)*
 * unary       := '-' unary | '+' unary | primary
 * primary     := NUMBER | LABEL | '$' | '(' expression ')'
 * ```
 * 
 * Supported operators:
 * - Arithmetic: +, -, *, / (integer division)
 * - Grouping: ( )
 * - Special: $ (current program counter)
 * - Labels: Resolved to their addresses
 * 
 * Expression examples:
 * - `OFFSET + 10` - Add 10 to label address
 * - `$ + 5` - Current address plus 5
 * - `(100 * 2) + LABEL` - Complex expression
 * - `VIDEO_RAM + (64 * row)` - Calculate screen position
 * 
 * @module evaluator
 */

/**
 * @typedef {Object} ParseResult
 * @property {number} value - The evaluated numeric value
 * @property {number} pos - Position in token array after parsing
 */

/**
 * Expression evaluator class
 * 
 * Evaluates arithmetic expressions using recursive descent parsing with
 * proper operator precedence. Resolves label references and special
 * symbols like $ (current address) before evaluation.
 * 
 * The evaluator is stateful, maintaining references to:
 * - Symbol table (for label lookups)
 * - Current address (for $ substitution)
 * 
 * @class
 * @example
 * const evaluator = new ExpressionEvaluator(symbolTable, 0x4200);
 * const tokens = [{type: 'NUMBER', value: 10}, ...];
 * const result = evaluator.evaluate(tokens);  // Returns numeric value
 */
export class ExpressionEvaluator {
  /**
   * Creates a new expression evaluator
   * 
   * @param {Object.<string, {address: number}>} symbolTable - Symbol table for label lookups
   * @param {number} currentAddress - Current assembly address (for $ substitution)
   */
  constructor(symbolTable, currentAddress) {
    /** @type {Object.<string, {address: number}>} */
    this.symbolTable = symbolTable;
    
    /** @type {number} */
    this.currentAddress = currentAddress;
  }

  /**
   * Evaluates an expression from an array of tokens
   * 
   * Main entry point for expression evaluation. Preprocesses tokens to:
   * 1. Remove whitespace and comments
   * 2. Substitute $ with current address
   * 3. Resolve label references to addresses
   * 
   * Then parses the processed tokens using recursive descent.
   * 
   * @param {Array<Object>} tokens - Array of tokens representing the expression
   * @returns {number} Evaluated numeric value (integer)
   * @throws {Error} If expression is empty, has syntax errors, or references undefined symbols
   * 
   * @example
   * // Simple addition
   * evaluate([
   *   {type: 'NUMBER', value: 10},
   *   {type: 'OPERATOR', value: '+'},
   *   {type: 'NUMBER', value: 5}
   * ]);  // Returns: 15
   * 
   * @example
   * // Label reference
   * evaluate([
   *   {type: 'LABEL', value: 'START'},
   *   {type: 'OPERATOR', value: '+'},
   *   {type: 'NUMBER', value: 10}
   * ]);  // Returns: (address of START) + 10
   */
  evaluate(tokens) {
    if (!tokens || tokens.length === 0) {
      throw new Error('Empty expression');
    }

    // Remove whitespace tokens and handle $ (current address)
    const processed = this.preprocess(tokens);
    
    if (processed.length === 0) {
      throw new Error('Empty expression after preprocessing');
    }

    // Parse using recursive descent
    return this.parseExpression(processed, 0).value;
  }

  /**
   * Preprocesses tokens before evaluation
   * 
   * Transforms tokens by:
   * 1. Removing whitespace, newlines, and comments
   * 2. Substituting $ with the current address value
   * 3. Resolving label references to their numeric addresses
   * 
   * This simplifies the parser by ensuring all operands are numbers.
   * 
   * @private
   * @param {Array<Object>} tokens - Raw token array
   * @returns {Array<Object>} Processed tokens with $ and labels resolved
   * @throws {Error} If an undefined symbol is referenced
   * 
   * @example
   * // Input:  [{type: 'LABEL', value: 'START'}, {type: 'OPERATOR', value: '$'}]
   * // Output: [{type: 'NUMBER', value: 0x4200}, {type: 'NUMBER', value: 0x4205}]
   */
  preprocess(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Skip whitespace, newlines, comments
      if (token.type === 'NEWLINE' || token.type === 'COMMENT') {
        continue;
      }

      // Handle $ (current address) - substitute with numeric value
      if (token.type === 'OPERATOR' && token.value === '$') {
        result.push({
          type: 'NUMBER',
          value: this.currentAddress,
          line: token.line,
          column: token.column
        });
        continue;
      }

      // Handle label references - look up in symbol table
      if (token.type === 'LABEL') {
        const symbol = this.symbolTable[token.value];
        if (symbol === undefined) {
          throw new Error(`Undefined symbol: ${token.value} at line ${token.line}`);
        }
        result.push({
          type: 'NUMBER',
          value: symbol.address,
          line: token.line,
          column: token.column
        });
        continue;
      }

      // Keep all other tokens as-is
      result.push(token);
    }
    return result;
  }

  /**
   * Parses a complete expression
   * 
   * Entry point for recursive descent parsing. Delegates to
   * parseAdditive which handles the lowest precedence operators.
   * 
   * @private
   * @param {Array<Object>} tokens - Preprocessed token array
   * @param {number} start - Starting position in token array
   * @returns {ParseResult} Parsed value and final position
   */
  parseExpression(tokens, start) {
    return this.parseAdditive(tokens, start);
  }

  /**
   * Parses additive expressions (+ and -)
   * 
   * Handles addition and subtraction with left-to-right associativity.
   * Lowest precedence level in the grammar.
   * 
   * Grammar: additive := multiplicative (('+' | '-') multiplicative)*
   * 
   * @private
   * @param {Array<Object>} tokens - Token array
   * @param {number} start - Starting position
   * @returns {ParseResult} Parsed value and final position
   * 
   * @example
   * // Parses: 10 + 20 - 5
   * // Result: {value: 25, pos: 5}
   */
  parseAdditive(tokens, start) {
    let left = this.parseMultiplicative(tokens, start);
    let pos = left.pos;

    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
        const op = token.value;
        const right = this.parseMultiplicative(tokens, pos + 1);
        if (op === '+') {
          left.value = left.value + right.value;
        } else {
          left.value = left.value - right.value;
        }
        pos = right.pos;
      } else {
        break;
      }
    }

    return { value: left.value, pos };
  }

  /**
   * Parses multiplicative expressions (* and /)
   * 
   * Handles multiplication and division with left-to-right associativity.
   * Higher precedence than addition/subtraction.
   * Division is integer division (truncates toward zero).
   * 
   * Grammar: multiplicative := unary (('*' | '/') unary)*
   * 
   * @private
   * @param {Array<Object>} tokens - Token array
   * @param {number} start - Starting position
   * @returns {ParseResult} Parsed value and final position
   * @throws {Error} If division by zero is attempted
   * 
   * @example
   * // Parses: 10 * 3 / 2
   * // Result: {value: 15, pos: 5}
   */
  parseMultiplicative(tokens, start) {
    let left = this.parseUnary(tokens, start);
    let pos = left.pos;

    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
        const op = token.value;
        const right = this.parseUnary(tokens, pos + 1);
        if (op === '*') {
          left.value = left.value * right.value;
        } else {
          // Integer division with zero check
          if (right.value === 0) {
            throw new Error(`Division by zero at line ${tokens[pos].line}`);
          }
          left.value = Math.floor(left.value / right.value);
        }
        pos = right.pos;
      } else {
        break;
      }
    }

    return { value: left.value, pos };
  }

  /**
   * Parses unary expressions and primary values
   * 
   * Handles:
   * - Unary minus: -expr
   * - Unary plus: +expr (no-op)
   * - Parenthesized expressions: (expr)
   * - Primary values: numbers
   * 
   * Highest precedence level in the grammar.
   * 
   * Grammar: unary := ('-' | '+') unary | primary
   *         primary := NUMBER | '(' expression ')'
   * 
   * @private
   * @param {Array<Object>} tokens - Token array
   * @param {number} start - Starting position
   * @returns {ParseResult} Parsed value and final position
   * @throws {Error} If unexpected token or unmatched parenthesis
   * 
   * @example
   * // Parses: -(10 + 5)
   * // Result: {value: -15, pos: 5}
   */
  parseUnary(tokens, start) {
    if (start >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }

    const token = tokens[start];

    // Unary minus
    if (token.type === 'OPERATOR' && token.value === '-') {
      const right = this.parseUnary(tokens, start + 1);
      return { value: -right.value, pos: right.pos };
    }

    // Unary plus (no-op)
    if (token.type === 'OPERATOR' && token.value === '+') {
      return this.parseUnary(tokens, start + 1);
    }

    // Parentheses
    if (token.type === 'LPAREN') {
      const expr = this.parseExpression(tokens, start + 1);
      if (expr.pos >= tokens.length || tokens[expr.pos].type !== 'RPAREN') {
        throw new Error(`Unmatched parenthesis at line ${token.line}`);
      }
      return { value: expr.value, pos: expr.pos + 1 };
    }

    // Number or identifier (already resolved in preprocess)
    if (token.type === 'NUMBER') {
      return { value: token.value, pos: start + 1 };
    }

    throw new Error(`Unexpected token: ${token.type} at line ${token.line}`);
  }
}

