/**
 * Expression evaluator for assembly expressions
 * Supports: +, -, *, /, $ (current address), parentheses, label references
 */

export class ExpressionEvaluator {
  constructor(symbolTable, currentAddress) {
    this.symbolTable = symbolTable;
    this.currentAddress = currentAddress;
  }

  /**
   * Evaluate an expression from tokens
   * @param {Array} tokens - Array of tokens representing the expression
   * @returns {number} Evaluated numeric value
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

  preprocess(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Skip whitespace, newlines, comments
      if (token.type === 'NEWLINE' || token.type === 'COMMENT') {
        continue;
      }

      // Handle $ (current address)
      if (token.type === 'OPERATOR' && token.value === '$') {
        result.push({
          type: 'NUMBER',
          value: this.currentAddress,
          line: token.line,
          column: token.column
        });
        continue;
      }

      // Handle label references
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

      result.push(token);
    }
    return result;
  }

  parseExpression(tokens, start) {
    return this.parseAdditive(tokens, start);
  }

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

