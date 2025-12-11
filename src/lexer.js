import { TOKEN, MNEMONICS, REGISTERS, DIRECTIVES } from './constants.js';

export class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  /**
   * Main entry point - tokenize entire source
   * @returns {Array} Array of token objects
   */
  tokenize() {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    this.tokens.push(this.makeToken(TOKEN.EOF, ''));
    return this.tokens;
  }

  scanToken() {
    this.skipWhitespace();
    if (this.isAtEnd()) return;

    const char = this.peek();

    // Comments
    if (char === ';') {
      this.scanComment();
      return;
    }

    // Newlines (significant in assembly)
    if (char === '\n') {
      this.tokens.push(this.makeToken(TOKEN.NEWLINE, '\\n'));
      this.advance();
      this.line++;
      this.column = 1;
      return;
    }

    // Numbers: $hex, 0xhex, %binary, decimal, or decimalH
    // Check if $ is followed by hex digit (then it's $hex), otherwise it's current address operator
    if (this.isDigit(char) || char === '%') {
      this.scanNumber();
      return;
    }
    
    // Handle $hex format for numbers (must be followed by hex digit)
    if (char === '$') {
      const next = this.peekNext();
      if (next && this.isHexDigit(next)) {
        this.scanNumber();
        return;
      }
      // Standalone $ is current address operator
      this.tokens.push(this.makeToken(TOKEN.OPERATOR, '$'));
      this.advance();
      return;
    }

    // Strings
    if (char === '"' || char === "'") {
      this.scanString(char);
      return;
    }

    // Identifiers (labels, mnemonics, registers, directives)
    if (this.isAlpha(char) || char === '_' || char === '.') {
      this.scanIdentifier();
      return;
    }

    // Single-character tokens
    const singleChars = {
      '(': TOKEN.LPAREN,
      ')': TOKEN.RPAREN,
      ',': TOKEN.COMMA,
      ':': TOKEN.COLON,
      '+': TOKEN.OPERATOR,
      '-': TOKEN.OPERATOR,
      '*': TOKEN.OPERATOR,
      '/': TOKEN.OPERATOR,
      '$': TOKEN.OPERATOR  // Current address
    };

    if (singleChars[char]) {
      this.tokens.push(this.makeToken(singleChars[char], char));
      this.advance();
      return;
    }

    // Unknown character - record error but continue
    this.tokens.push(this.makeToken('ERROR', char));
    this.advance();
  }

  scanNumber() {
    const startCol = this.column;
    let value = '';

    if (this.peek() === '$') {
      // Hex: $FF
      this.advance();
      while (this.isHexDigit(this.peek())) {
        value += this.advance();
      }
      this.tokens.push({
        type: TOKEN.NUMBER,
        value: parseInt(value, 16),
        raw: '$' + value,
        line: this.line,
        column: startCol
      });
    } else if (this.peek() === '%') {
      // Binary: %10101010
      this.advance();
      while (this.peek() === '0' || this.peek() === '1') {
        value += this.advance();
      }
      this.tokens.push({
        type: TOKEN.NUMBER,
        value: parseInt(value, 2),
        raw: '%' + value,
        line: this.line,
        column: startCol
      });
    } else {
      // Decimal or hex with H suffix
      while (this.isHexDigit(this.peek())) {
        value += this.advance();
      }
      if (this.peek()?.toUpperCase() === 'H') {
        this.advance();
        this.tokens.push({
          type: TOKEN.NUMBER,
          value: parseInt(value, 16),
          raw: value + 'H',
          line: this.line,
          column: startCol
        });
      } else {
        this.tokens.push({
          type: TOKEN.NUMBER,
          value: parseInt(value, 10),
          raw: value,
          line: this.line,
          column: startCol
        });
      }
    }
  }

  scanIdentifier() {
    const startCol = this.column;
    let value = '';

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '.') {
      value += this.advance();
    }

    // Check for AF' special case
    if (value.toUpperCase() === 'AF' && this.peek() === "'") {
      value += this.advance();
    }

    const upper = value.toUpperCase();

    // Classify the identifier
    let type;
    if (MNEMONICS.has(upper)) {
      type = TOKEN.MNEMONIC;
    } else if (REGISTERS.has(upper)) {
      type = TOKEN.REGISTER;
    } else if (DIRECTIVES.has(upper)) {
      type = TOKEN.DIRECTIVE;
    } else {
      type = TOKEN.LABEL;
    }

    this.tokens.push({
      type: type,
      value: upper,
      raw: value,
      line: this.line,
      column: startCol
    });
  }

  scanComment() {
    const startCol = this.column;
    let value = '';
    this.advance(); // skip ;
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }
    // Comments can be discarded or kept for debugging
    this.tokens.push({
      type: TOKEN.COMMENT,
      value: value.trim(),
      line: this.line,
      column: startCol
    });
  }

  scanString(quote) {
    const startCol = this.column;
    let value = '';
    this.advance(); // skip opening quote
    while (!this.isAtEnd() && this.peek() !== quote && this.peek() !== '\n') {
      value += this.advance();
    }
    if (this.peek() === quote) {
      this.advance(); // skip closing quote
    }
    this.tokens.push({
      type: TOKEN.STRING,
      value: value,
      line: this.line,
      column: startCol
    });
  }

  // Helper methods
  makeToken(type, value) {
    return { type, value, line: this.line, column: this.column };
  }

  peek() {
    return this.source[this.pos];
  }

  peekNext() {
    return this.source[this.pos + 1];
  }

  advance() {
    const char = this.source[this.pos++];
    this.column++;
    return char;
  }

  isAtEnd() {
    return this.pos >= this.source.length;
  }

  skipWhitespace() {
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\r')) {
      this.advance();
    }
  }

  isDigit(c) { return c >= '0' && c <= '9'; }
  isHexDigit(c) { return this.isDigit(c) || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f'); }
  isAlpha(c) { return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'); }
  isAlphaNumeric(c) { return this.isAlpha(c) || this.isDigit(c); }
}

