import { TOKEN, MEMORY, CONDITIONS, REG8, REG16 } from './constants.js';
import { ExpressionEvaluator } from './evaluator.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens.filter(t => t.type !== TOKEN.COMMENT); // strip comments
    this.pos = 0;
    this.errors = [];
    this.warnings = [];
    this.symbolTable = {};
    this.currentAddress = MEMORY.DEFAULT_ORG;
    this.instructions = []; // intermediate representation
    this.pass = 1; // Track which pass we're in
  }

  /**
   * Two-pass assembly
   * Pass 1: Collect labels and calculate addresses
   * Pass 2: Resolve forward references and generate code
   */
  parse() {
    // Pass 1
    this.pass = 1;
    this.pos = 0;
    this.currentAddress = MEMORY.DEFAULT_ORG;
    this.symbolTable = {};
    
    while (!this.isAtEnd()) {
      try {
        this.parseLinePass1();
      } catch (e) {
        this.errors.push({ message: e.message, line: this.currentLine() });
        this.synchronize();
      }
    }

    // Pass 2
    this.pass = 2;
    this.pos = 0;
    this.currentAddress = MEMORY.DEFAULT_ORG;
    this.instructions = [];
    
    while (!this.isAtEnd()) {
      try {
        this.parseLinePass2();
      } catch (e) {
        this.errors.push({ message: e.message, line: this.currentLine() });
        this.synchronize();
      }
    }

    return {
      instructions: this.instructions,
      symbolTable: this.symbolTable,
      errors: this.errors,
      warnings: this.warnings,
      startAddress: MEMORY.DEFAULT_ORG
    };
  }

  parseLinePass1() {
    // Skip newlines
    while (this.check(TOKEN.NEWLINE)) {
      this.advance();
    }
    if (this.isAtEnd()) return;

    // Check for label (with colon) - defines label at current address
    if (this.check(TOKEN.LABEL) && this.checkNext(TOKEN.COLON)) {
      const label = this.advance();
      this.advance(); // consume colon
      this.defineSymbol(label.value, this.currentAddress);
    }
    
    // Check for label before directive (without colon) - e.g., LABEL .EQU value
    // Consume the label so we can process the directive
    if (this.check(TOKEN.LABEL) && !this.checkNext(TOKEN.COLON)) {
      const nextToken = this.tokens[this.pos + 1];
      if (nextToken && nextToken.type === TOKEN.DIRECTIVE) {
        const directiveValue = nextToken.value.toUpperCase();
        // For EQU and DEFL, don't define the label here - let the directive handler do it
        // For other directives like .DB, define the label at current address
        if (directiveValue !== '.EQU' && directiveValue !== 'EQU' && 
            directiveValue !== '.DEFL' && directiveValue !== 'DEFL') {
          const label = this.advance(); // consume label
          this.defineSymbol(label.value, this.currentAddress);
        } else {
          // For EQU/DEFL, just consume the label without defining it
          this.advance();
        }
      }
    }

    // Check for directive
    if (this.check(TOKEN.DIRECTIVE)) {
      // Label should already be consumed above, so just process the directive
      this.parseDirectivePass1();
      return;
    }

    // Check for instruction
    if (this.check(TOKEN.MNEMONIC)) {
      const size = this.calculateInstructionSize();
      this.currentAddress += size;
      // Skip the instruction and its operands
      this.skipToNewline();
      return;
    }

    // Unknown - skip to newline
    this.skipToNewline();
  }

  parseLinePass2() {
    // Skip newlines
    while (this.check(TOKEN.NEWLINE)) {
      this.advance();
    }
    if (this.isAtEnd()) return;

    // Check for label (with colon)
    if (this.check(TOKEN.LABEL) && this.checkNext(TOKEN.COLON)) {
      const afterColon = this.tokens[this.pos + 2];
      if (afterColon && afterColon.type === TOKEN.DIRECTIVE) {
        // Label before directive - advance past label and colon
        // so directive can be processed, and parseDBPass2 can detect the label
        this.advance(); // consume label
        this.advance(); // consume colon
        // Now at directive - it will be processed below
      } else {
        const label = this.advance();
        this.advance(); // colon
        // Symbol table will be updated in codegen with actual addresses
      }
    }
    
    // Check for label before directive without colon (like RESULT .DB 0)
    if (this.check(TOKEN.LABEL) && !this.checkNext(TOKEN.COLON)) {
      const nextToken = this.tokens[this.pos + 1];
      if (nextToken && nextToken.type === TOKEN.DIRECTIVE) {
        // Label before directive - advance past label
        this.advance(); // consume label
        // Now at directive - it will be processed below
      }
    }
    
    // Check for directive
    if (this.check(TOKEN.DIRECTIVE)) {
      this.parseDirectivePass2();
      return;
    }

    // Check for instruction
    if (this.check(TOKEN.MNEMONIC)) {
      this.parseInstruction();
      return;
    }

    // Unknown - skip to newline
    this.skipToNewline();
  }

  parseDirectivePass1() {
    const directive = this.advance();

    switch (directive.value) {
      case '.ORG':
      case 'ORG':
        const addr = this.parseExpressionValue();
        this.currentAddress = addr;
        break;

      case '.EQU':
      case 'EQU':
        // EQU format: LABEL .EQU value
        // The label is BEFORE the directive, so look back for it
        let equLabel = null;
        if (this.pos > 1) {
          const prevToken = this.tokens[this.pos - 2]; // -2 because we already advanced past directive
          if (prevToken && prevToken.type === TOKEN.LABEL) {
            equLabel = prevToken.value;
          }
        }
        if (equLabel) {
          // For .EQU, don't allow forward references - evaluate immediately
          const value = this.parseExpressionValue(false);
          this.defineSymbol(equLabel, value, 'EQU');
        }
        break;

      case '.DEFL':
      case 'DEFL':
        // DEFL format: LABEL .DEFL value (similar to EQU)
        let deflLabel = null;
        if (this.pos > 1) {
          const prevToken = this.tokens[this.pos - 2]; // -2 because we already advanced past directive
          if (prevToken && prevToken.type === TOKEN.LABEL) {
            deflLabel = prevToken.value;
          }
        }
        if (deflLabel) {
          const value = this.parseExpressionValue(false);
          this.defineSymbol(deflLabel, value, 'DEFL');
        }
        break;

      case '.DB':
      case 'DB':
      case 'DEFB':
        this.parseDBPass1();
        break;

      case '.DW':
      case 'DW':
      case 'DEFW':
        this.parseDWPass1();
        break;

      case '.DS':
      case 'DS':
      case 'DEFS':
        const count = this.parseExpressionValue();
        this.currentAddress += count;
        break;

      case '.END':
      case 'END':
        // End of source - stop parsing
        while (!this.isAtEnd()) {
          this.advance();
        }
        break;
    }

    this.skipToNewline();
  }

  parseDirectivePass2() {
    const directive = this.advance();

    switch (directive.value) {
      case '.ORG':
      case 'ORG':
        const addr = this.parseExpressionValue();
        this.currentAddress = addr;
        break;

      case '.EQU':
      case 'EQU':
      case '.DEFL':
      case 'DEFL':
        // Skip - already defined in pass 1
        if (this.check(TOKEN.LABEL)) {
          this.advance();
        }
        if (this.check(TOKEN.COMMA)) {
          this.advance(); // consume comma if present
        }
        this.parseExpressionValue();
        break;

      case '.DB':
      case 'DB':
      case 'DEFB':
        // Check if there's a label before this directive
        if (this.pos > 0) {
          const prevToken = this.tokens[this.pos - 1];
          if (prevToken && prevToken.type === TOKEN.LABEL && !this.check(TOKEN.COLON)) {
            // Label was already processed, but make sure it's defined
            // (handled in parseLinePass2 label check)
          }
        }
        this.parseDBPass2();
        break;

      case '.DW':
      case 'DW':
      case 'DEFW':
        // Check if there's a label before this directive
        if (this.pos > 0) {
          const prevToken = this.tokens[this.pos - 1];
          if (prevToken && prevToken.type === TOKEN.LABEL && !this.check(TOKEN.COLON)) {
            // Label was already processed
          }
        }
        this.parseDWPass2();
        break;

      case '.DS':
      case 'DS':
      case 'DEFS':
        const count = this.parseExpressionValue();
        // Reserve space (fill with zeros)
        for (let i = 0; i < count; i++) {
          this.instructions.push({
            type: 'DATA',
            bytes: [0],
            address: this.currentAddress++
          });
        }
        break;

      case '.END':
      case 'END':
        while (!this.isAtEnd()) {
          this.advance();
        }
        break;
    }

    this.skipToNewline();
  }

  parseDBPass1() {
    // Count bytes
    let count = 0;
    const startPos = this.pos;
    
    while (!this.check(TOKEN.NEWLINE) && !this.isAtEnd()) {
      if (this.check(TOKEN.STRING)) {
        const str = this.advance();
        count += str.value.length;
      } else if (this.check(TOKEN.NUMBER)) {
        this.advance();
        count++;
      } else if (this.check(TOKEN.COMMA)) {
        this.advance();
      } else {
        break;
      }
    }
    
    this.currentAddress += count;
    this.pos = startPos; // Reset for pass 2
  }

  parseDBPass2() {
    // Check if there's a label before this directive
    // After parseDirectivePass2 consumes .DB, we're at:
    // pos-3: LABEL, pos-2: COLON, pos-1: .DB (already consumed), pos: first data token
    let labelName = null;
    
    // Look back for label pattern: LABEL COLON .DB or LABEL .DB
    if (this.pos > 2) {
      const tok1 = this.tokens[this.pos - 1]; // Should be .DB
      const tok2 = this.tokens[this.pos - 2]; // Could be COLON
      const tok3 = this.tokens[this.pos - 3]; // Could be LABEL
      
      if (tok3 && tok3.type === TOKEN.LABEL && tok2 && tok2.type === TOKEN.COLON && tok1 && tok1.type === TOKEN.DIRECTIVE) {
        // Pattern: LABEL COLON .DB
        labelName = tok3.value;
      }
    }
    
    if (!labelName && this.pos > 1) {
      const tok1 = this.tokens[this.pos - 1]; // Should be .DB
      const tok2 = this.tokens[this.pos - 2]; // Could be LABEL
      
      if (tok2 && tok2.type === TOKEN.LABEL && tok1 && tok1.type === TOKEN.DIRECTIVE) {
        // Pattern: LABEL .DB
        labelName = tok2.value;
      }
    }
    
    // Also check current position in case label wasn't consumed yet
    if (!labelName && this.check(TOKEN.LABEL)) {
      const label = this.peek();
      const nextToken = this.tokens[this.pos + 1];
      if (nextToken && (nextToken.type === TOKEN.COLON || nextToken.type === TOKEN.NUMBER || nextToken.type === TOKEN.STRING)) {
        labelName = label.value;
        if (nextToken.type === TOKEN.COLON) {
          this.advance(); // consume label
          this.advance(); // consume colon
        } else {
          this.advance(); // consume label only
        }
      }
    }
    
    // Generate the data at current address
    let firstData = true;
    while (!this.check(TOKEN.NEWLINE) && !this.isAtEnd()) {
      if (this.check(TOKEN.STRING)) {
        const str = this.advance();
        for (let i = 0; i < str.value.length; i++) {
          this.instructions.push({
            type: 'DATA',
            bytes: [str.value.charCodeAt(i) & 0xFF],
            address: this.currentAddress,
            label: (firstData && i === 0) ? labelName : null
          });
          this.currentAddress++;
          firstData = false;
        }
      } else if (this.check(TOKEN.NUMBER) || this.check(TOKEN.LABEL)) {
        const num = this.parseExpressionValue();
        this.instructions.push({
          type: 'DATA',
          bytes: [num & 0xFF],
          address: this.currentAddress,
          label: firstData ? labelName : null
        });
        this.currentAddress++;
        firstData = false;
      } else if (this.check(TOKEN.COMMA)) {
        this.advance();
      } else {
        break;
      }
    }
  }

  parseDWPass1() {
    // Count words (2 bytes each)
    let count = 0;
    const startPos = this.pos;
    
    while (!this.check(TOKEN.NEWLINE) && !this.isAtEnd()) {
      if (this.check(TOKEN.NUMBER) || this.check(TOKEN.LABEL)) {
        this.advance();
        count++;
      } else if (this.check(TOKEN.COMMA)) {
        this.advance();
      } else {
        break;
      }
    }
    
    this.currentAddress += count * 2;
    this.pos = startPos; // Reset for pass 2
  }

  parseDWPass2() {
    while (!this.check(TOKEN.NEWLINE) && !this.isAtEnd()) {
      if (this.check(TOKEN.NUMBER) || this.check(TOKEN.LABEL)) {
        const value = this.parseExpressionValue();
        const lo = value & 0xFF;
        const hi = (value >> 8) & 0xFF;
        this.instructions.push({
          type: 'DATA',
          bytes: [lo, hi],
          address: this.currentAddress
        });
        this.currentAddress += 2;
      } else if (this.check(TOKEN.COMMA)) {
        this.advance();
      } else {
        break;
      }
    }
  }

  parseInstruction() {
    const mnemonic = this.advance();
    const operands = this.parseOperands();
    
    // Check if there was a label before this instruction (with colon)
    let labelName = null;
    if (this.pos > 1) {
      const prevToken = this.tokens[this.pos - 2];
      const prevPrev = this.tokens[this.pos - 3];
      if (prevToken && prevToken.type === TOKEN.COLON && prevPrev && prevPrev.type === TOKEN.LABEL) {
        labelName = prevPrev.value;
      }
    }

    this.instructions.push({
      type: 'INSTRUCTION',
      mnemonic: mnemonic.value,
      operands: operands,
      address: this.currentAddress,
      bytes: [], // Will be filled by code generator
      label: labelName // Store label name if present
    });

    // Estimate size for address tracking in pass 2
    // For size estimation, we can resolve operands (using pass 1 addresses is OK for estimation)
    const size = this.estimateInstructionSize(mnemonic.value, operands);
    this.currentAddress += size;
  }
  
  estimateInstructionSize(mnemonic, operands) {
    // Quick size estimation based on mnemonic and operands
    if (['NOP', 'HALT', 'DI', 'EI', 'SCF', 'CCF', 'CPL', 'DAA', 'RLCA', 'RRCA', 'RLA', 'RRA', 'RET', 'EXX'].includes(mnemonic)) {
      return 1;
    }
    if (['LDIR', 'LDDR', 'LDI', 'LDD', 'RETI', 'RETN', 'NEG'].includes(mnemonic)) {
      return 2;
    }
    if (['JP', 'CALL'].includes(mnemonic)) {
      return 3;
    }
    if (['JR', 'DJNZ'].includes(mnemonic)) {
      return 2;
    }
    if (mnemonic === 'LD' && operands.length === 2) {
      // Check operand types
      const [op1, op2] = operands;
      if (typeof op1 === 'number' && op1 > 255) return 3;
      if (typeof op2 === 'number' && op2 > 255) return 3;
      if (typeof op2 === 'number' && op2 <= 255 && typeof op1 === 'string' && REG8[op1] !== undefined) return 2;
      if (op1 === '(HL)' || op2 === '(HL)') return 1;
      if (typeof op1 === 'string' && REG8[op1] && typeof op2 === 'string' && REG8[op2]) return 1;
      return 2; // Default estimate
    }
    if (['ADD', 'ADC', 'SUB', 'SBC', 'AND', 'OR', 'XOR', 'CP'].includes(mnemonic)) {
      if (operands.length === 1 && typeof operands[0] === 'number') return 2;
      return 1;
    }
    if (mnemonic === 'ADD' && operands.length === 2 && operands[0] === 'HL') {
      return 1;
    }
    if (['INC', 'DEC', 'PUSH', 'POP'].includes(mnemonic)) {
      return 1;
    }
    if (['BIT', 'SET', 'RES', 'RLC', 'RRC', 'RL', 'RR', 'SLA', 'SRA', 'SLL', 'SRL'].includes(mnemonic)) {
      return 2;
    }
    if (['IN', 'OUT'].includes(mnemonic)) {
      return 2;
    }
    return 1; // Default
  }

  parseOperands() {
    const operands = [];

    if (this.check(TOKEN.NEWLINE) || this.isAtEnd()) {
      return operands;
    }

    // Parse first operand
    operands.push(this.parseOperand());

    // Parse additional operands separated by commas
    while (this.check(TOKEN.COMMA)) {
      this.advance(); // consume comma
      operands.push(this.parseOperand());
    }

    return operands;
  }

  parseOperand() {
    // Handle (HL), (BC), (DE), (nn) patterns first
    if (this.check(TOKEN.LPAREN)) {
      this.advance(); // consume (
      
      // Check for register in parentheses
      if (this.check(TOKEN.REGISTER)) {
        const reg = this.advance();
        this.consume(TOKEN.RPAREN);
        
        if (reg.value === 'HL') return '(HL)';
        if (reg.value === 'BC') return '(BC)';
        if (reg.value === 'DE') return '(DE)';
        throw new Error(`Invalid register in parentheses: ${reg.value}`);
      }
      
      // In pass 2, check if it's just a label in parentheses FIRST (before expression parsing)
      if (this.pass === 2) {
        const savedPos = this.pos;
        // Skip whitespace/newlines to find next meaningful token
        let checkPos = this.pos;
        while (checkPos < this.tokens.length) {
          const tok = this.tokens[checkPos];
          if (tok.type === TOKEN.NEWLINE || tok.type === TOKEN.COMMENT) {
            checkPos++;
            continue;
          }
          // Found a meaningful token
          if (tok.type === TOKEN.LABEL) {
            // Check if next meaningful token after label is RPAREN (not operator)
            let nextCheck = checkPos + 1;
            while (nextCheck < this.tokens.length) {
              const nextTok = this.tokens[nextCheck];
              if (nextTok.type === TOKEN.NEWLINE || nextTok.type === TOKEN.COMMENT) {
                nextCheck++;
                continue;
              }
              if (nextTok.type === TOKEN.RPAREN) {
                // It's (label) - store as label reference for deferred resolution
                const label = this.tokens[checkPos];
                this.pos = nextCheck + 1; // Advance past RPAREN
                return { type: 'LABEL_REF', name: label.value };
              }
              // Next token is not RPAREN - it's an expression
              break;
            }
          }
          // Not a label or it's part of an expression
          break;
        }
        this.pos = savedPos;
      }
      
      // For expressions or pass 1, parse normally
      // Check if it's an expression starting with $, number, or label
      const nextType = this.peek()?.type;
      if (nextType === TOKEN.OPERATOR || nextType === TOKEN.NUMBER || nextType === TOKEN.LABEL) {
        // It's an expression, parse it
        const addr = this.parseExpressionValue();
        this.consume(TOKEN.RPAREN);
        return addr; // Return as number for (nn) addressing
      }
      
      // Fallback: parse as expression
      const addr = this.parseExpressionValue();
      this.consume(TOKEN.RPAREN);
      return addr; // Return as number for (nn) addressing
    }

    // Check if this is an expression (starts with $, number, or label followed by operator)
    const nextType = this.tokens[this.pos + 1]?.type;
    if (this.check(TOKEN.OPERATOR) && this.peek().value === '$') {
      // Expression starting with $ (current address)
      return this.parseExpressionValue();
    }
    
    if (this.check(TOKEN.NUMBER)) {
      // Check if followed by operator - if so, it's an expression
      if (nextType === TOKEN.OPERATOR) {
        return this.parseExpressionValue();
      }
      return this.parseExpressionValue();
    }

    if (this.check(TOKEN.REGISTER)) {
      const reg = this.advance();
      return reg.value;
    }

    if (this.check(TOKEN.LABEL)) {
      const labelToken = this.peek();
      
      // Check if it's a condition code (used in JP cc, JR cc, CALL cc, RET cc)
      if (CONDITIONS[labelToken.value] !== undefined) {
        const cond = this.advance();
        return cond.value; // Return condition code as string
      }
      
      // Check if this is part of an expression (next token is operator)
      if (nextType === TOKEN.OPERATOR || nextType === TOKEN.LPAREN) {
        // It's an expression, parse it
        return this.parseExpressionValue();
      }
      
      // Single label reference
      const label = this.advance();
      
      // In pass 2, don't resolve labels during parsing - store label name
      // Resolution will happen in codegen when all labels are updated
      if (this.pass === 2) {
        // Store as special marker object to indicate it needs resolution
        return { type: 'LABEL_REF', name: label.value };
      }
      
      // Pass 1: resolve or return placeholder
      const symbol = this.symbolTable[label.value];
      if (symbol === undefined) {
        // Forward reference in pass 1 - return placeholder
        return 0;
      }
      return symbol.address;
    }

    throw new Error(`Unexpected operand token: ${this.peek()?.type}`);
  }

  parseExpressionValue(allowForwardRefs = true) {
    const evaluator = new ExpressionEvaluator(this.symbolTable, this.currentAddress);
    const exprTokens = this.collectExpressionTokens();
    try {
      return evaluator.evaluate(exprTokens);
    } catch (e) {
      // In pass 1, forward references are OK for size calculation
      // But for .EQU, we need actual values, so don't allow forward refs there
      if (allowForwardRefs && (e.message.includes('Undefined symbol') || e.message.includes('Undefined label'))) {
        return 0; // Placeholder for pass 1
      }
      throw e;
    }
  }

  collectExpressionTokens() {
    const tokens = [];
    let depth = 0;

    while (!this.isAtEnd()) {
      const token = this.peek();

      if (token.type === TOKEN.NEWLINE) break;
      if (token.type === TOKEN.COMMA && depth === 0) break;

      if (token.type === TOKEN.LPAREN) depth++;
      if (token.type === TOKEN.RPAREN) {
        if (depth === 0) break;
        depth--;
      }

      tokens.push(this.advance());
    }

    return tokens;
  }

  calculateInstructionSize() {
    const startPos = this.pos;
    const mnemonic = this.peek();
    
    if (!mnemonic || mnemonic.type !== TOKEN.MNEMONIC) {
      this.pos = startPos;
      return 0;
    }

    const mnem = mnemonic.value;
    this.advance(); // consume mnemonic
    
    // Instructions with no operands
    if (['NOP', 'HALT', 'DI', 'EI', 'SCF', 'CCF', 'CPL', 'DAA', 'RLCA', 'RRCA', 'RLA', 'RRA', 'RET', 'EXX', 'EX DE,HL', 'EX AF,AF\''].includes(mnem)) {
      this.pos = startPos;
      return 1;
    }
    
    // ED-prefixed instructions (2 bytes)
    if (['LDIR', 'LDDR', 'LDI', 'LDD', 'RETI', 'RETN', 'NEG'].includes(mnem)) {
      this.pos = startPos;
      return 2;
    }
    
    // Always 3-byte instructions
    if (['JP', 'CALL'].includes(mnem)) {
      // Check if conditional (2 operands = conditional, 1 = unconditional, both 3 bytes)
      this.skipToNewline();
      this.pos = startPos;
      return 3;
    }
    
    // Always 2-byte relative jumps
    if (['JR', 'DJNZ'].includes(mnem)) {
      this.skipToNewline();
      this.pos = startPos;
      return 2;
    }
    
    // Try to parse operands to determine size
    let operandCount = 0;
    let hasImmediate = false;
    let has16Bit = false;
    let hasRegister = false;
    let hasIndirect = false;
    
    while (!this.check(TOKEN.NEWLINE) && !this.isAtEnd()) {
      if (this.check(TOKEN.NUMBER) || this.check(TOKEN.OPERATOR)) {
        // Could be immediate value or expression
        const savedPos = this.pos;
        try {
          const val = this.parseExpressionValue(true); // Allow forward refs for size calc
          hasImmediate = true;
          if (val > 255 || val < 0) has16Bit = true;
          operandCount++;
        } catch (e) {
          this.pos = savedPos;
          // Estimate: if it's a number token, likely immediate
          if (this.check(TOKEN.NUMBER)) {
            this.advance();
            hasImmediate = true;
            operandCount++;
          } else {
            break;
          }
        }
      } else if (this.check(TOKEN.LABEL)) {
        // Could be label (forward ref) or condition code
        const label = this.peek();
        if (CONDITIONS[label.value] !== undefined) {
          this.advance(); // condition code
          operandCount++;
        } else {
          // Forward reference - estimate based on instruction
          this.advance();
          operandCount++;
          // For size calculation, assume it's an address if in certain contexts
          if (mnem === 'LD' || mnem === 'JP' || mnem === 'CALL') {
            has16Bit = true;
          }
        }
      } else if (this.check(TOKEN.REGISTER)) {
        this.advance();
        hasRegister = true;
        operandCount++;
      } else if (this.check(TOKEN.COMMA)) {
        this.advance();
      } else if (this.check(TOKEN.LPAREN)) {
        this.advance();
        if (this.check(TOKEN.REGISTER)) {
          this.advance();
          this.consume(TOKEN.RPAREN);
          hasIndirect = true;
          operandCount++;
        } else {
          // (nn) - 16-bit address
          has16Bit = true;
          hasIndirect = true;
          // Try to parse, but don't fail on forward refs
          const savedPos = this.pos;
          try {
            this.parseExpressionValue(true);
          } catch (e) {
            // Ignore - it's a forward ref, assume 16-bit
          }
          this.consume(TOKEN.RPAREN);
          operandCount++;
        }
      } else {
        break;
      }
    }
    
    this.pos = startPos; // reset

    // Calculate size based on instruction and operands
    if (mnem === 'LD') {
      if (operandCount === 2) {
        if (has16Bit) return 3; // LD dd,nn or LD (nn),r
        if (hasImmediate && hasRegister) return 2; // LD r,n (8-bit immediate)
        if (hasRegister && hasIndirect) return 1; // LD (HL),r or LD r,(HL)
        if (hasRegister && !hasImmediate) return 1; // LD r,r
        if (hasImmediate && hasIndirect) return 2; // LD (HL),n
        return 2; // Default estimate
      }
      return 2;
    }
    
    if (['ADD', 'ADC', 'SUB', 'SBC', 'AND', 'OR', 'XOR', 'CP'].includes(mnem)) {
      if (hasImmediate) return 2; // ALU A,n
      return 1; // ALU A,r
    }
    
    if (mnem === 'ADD' && operandCount === 2 && hasRegister) {
      return 1; // ADD HL,ss
    }
    
    if (['INC', 'DEC'].includes(mnem)) {
      if (hasRegister && !hasIndirect) {
        // Check if 16-bit register
        return 1; // Both 8-bit and 16-bit INC/DEC are 1 byte
      }
      if (hasIndirect) return 1; // INC (HL), DEC (HL)
      return 1;
    }
    
    if (['PUSH', 'POP'].includes(mnem)) {
      return 1;
    }
    
    if (mnem === 'RET' && operandCount > 0) {
      return 1; // RET cc
    }
    
    if (mnem === 'RST') {
      return 1;
    }
    
    if (['BIT', 'SET', 'RES', 'RLC', 'RRC', 'RL', 'RR', 'SLA', 'SRA', 'SLL', 'SRL'].includes(mnem)) {
      return 2; // CB-prefixed
    }
    
    if (['IN', 'OUT'].includes(mnem)) {
      return 2; // IN A,(n), OUT (n),A
    }
    
    // Default estimates
    if (has16Bit) return 3;
    if (hasImmediate) return 2;
    return 1;
  }

  defineSymbol(name, address, type = 'LABEL') {
    if (this.symbolTable[name] && type !== 'DEFL') {
      this.warnings.push({
        message: `Symbol ${name} redefined`,
        line: this.currentLine()
      });
    }
    this.symbolTable[name] = { address, type };
  }

  consume(expectedType) {
    if (this.check(expectedType)) {
      return this.advance();
    }
    throw new Error(`Expected ${expectedType}, got ${this.peek()?.type}`);
  }

  synchronize() {
    // Skip to next line
    while (!this.isAtEnd() && !this.check(TOKEN.NEWLINE)) {
      this.advance();
    }
    if (this.check(TOKEN.NEWLINE)) {
      this.advance();
    }
  }

  skipToNewline() {
    while (!this.isAtEnd() && !this.check(TOKEN.NEWLINE)) {
      this.advance();
    }
    if (this.check(TOKEN.NEWLINE)) {
      this.advance();
    }
  }

  peek() { return this.tokens[this.pos]; }
  advance() { return this.tokens[this.pos++]; }
  isAtEnd() { return this.pos >= this.tokens.length || this.peek()?.type === TOKEN.EOF; }
  check(type) { return this.peek()?.type === type; }
  checkNext(type) { return this.tokens[this.pos + 1]?.type === type; }
  currentLine() { return this.peek()?.line ?? this.tokens[this.pos - 1]?.line ?? 1; }
}

