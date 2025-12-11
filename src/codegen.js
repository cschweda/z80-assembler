import {
  SIMPLE_INSTRUCTIONS,
  encodeLD,
  encodeJP,
  encodeJR,
  encodeDJNZ,
  encodeALU,
  encodeADDHL,
  encodeINC,
  encodeDEC,
  encodePUSH,
  encodePOP,
  encodeCALL,
  encodeRETCC,
  encodeRST,
  encodeCB,
  encodeIN,
  encodeOUT
} from './opcodes.js';
import { ExpressionEvaluator } from './evaluator.js';

export class CodeGenerator {
  constructor(symbolTable, currentAddress) {
    this.symbolTable = symbolTable;
    this.currentAddress = currentAddress;
  }

  /**
   * Generate bytecode for a list of instructions
   * @param {Array} instructions - Parsed instruction IR
   * @returns {Array} Array of instruction objects with bytes filled in
   */
  generate(instructions) {
    const result = [];
    let currentAddress = this.currentAddress;
    
    // First pass: generate all code and update addresses
    for (const inst of instructions) {
      if (inst.type === 'DATA') {
        inst.address = currentAddress;
        
        // Update symbol table if this data has an associated label
        // This happens at the correct address since we're tracking currentAddress correctly
        if (inst.label) {
          this.symbolTable[inst.label] = { address: currentAddress, type: 'LABEL' };
        }
        
        currentAddress += inst.bytes.length;
        result.push(inst);
        continue;
      }

      if (inst.type === 'INSTRUCTION') {
        // Update current address for this instruction
        this.currentAddress = currentAddress;
        inst.address = currentAddress;
        
        // Update symbol table if this instruction has an associated label
        if (inst.label) {
          this.symbolTable[inst.label] = { address: currentAddress, type: 'LABEL' };
        }
        
        // Generate encoding (this may reference labels that haven't been updated yet)
        try {
          const encoding = this.encodeInstruction(inst);
          inst.bytes = encoding.bytes;
          currentAddress += encoding.bytes.length;
          result.push(inst);
        } catch (e) {
          throw new Error(`Line ${inst.address}: ${e.message}`);
        }
      }
    }
    
    // Second pass: re-resolve any label references now that all addresses are correct
    // This is needed because some instructions may have referenced forward labels
    // that were defined later in the code
    for (const inst of result) {
      if (inst.type === 'INSTRUCTION') {
        // Check if operands contain label references that need re-resolution
        const needsReresolve = inst.operands && inst.operands.some(op => 
          op && typeof op === 'object' && op.type === 'LABEL_REF'
        );
        
        if (needsReresolve) {
          // Re-encode with updated symbol table (all labels should now have correct addresses)
          try {
            this.currentAddress = inst.address;
            const encoding = this.encodeInstruction(inst);
            inst.bytes = encoding.bytes;
          } catch (e) {
            // If re-encoding fails, the original encoding should still work
            // (labels should have been resolved in first pass)
            console.warn(`Warning: Failed to re-encode instruction at ${inst.address.toString(16)}: ${e.message}`);
          }
        }
      }
    }

    return result;
  }

  encodeInstruction(inst) {
    const { mnemonic, operands } = inst;

    // Simple instructions with no operands
    if (SIMPLE_INSTRUCTIONS[mnemonic]) {
      const def = SIMPLE_INSTRUCTIONS[mnemonic];
      if (def.prefix !== undefined) {
        return {
          bytes: [def.prefix, def.opcode],
          size: def.size
        };
      }
      return {
        bytes: [def.opcode],
        size: def.size
      };
    }

    // LD instruction
    if (mnemonic === 'LD') {
      // Update currentAddress for operand resolution
      const savedAddr = this.currentAddress;
      this.currentAddress = inst.address;
      const resolved = this.resolveOperands(operands, inst.address);
      this.currentAddress = savedAddr;
      return encodeLD(resolved);
    }

    // JP instruction
    if (mnemonic === 'JP') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeJP(resolved);
    }

    // JR instruction
    if (mnemonic === 'JR') {
      const savedAddr = this.currentAddress;
      this.currentAddress = inst.address;
      const resolved = this.resolveOperands(operands, inst.address);
      this.currentAddress = savedAddr;
      // For relative jumps, calculate offset from instruction end
      if (resolved.length === 1 && typeof resolved[0] === 'number') {
        // Calculate relative offset: target - (current + 2)
        const target = resolved[0];
        const current = inst.address;
        const offset = target - (current + 2);
        // Clamp to signed 8-bit
        if (offset < -128 || offset > 127) {
          throw new Error(`Relative jump out of range: ${offset} (must be -128 to 127)`);
        }
        return encodeJR([offset]);
      }
      if (resolved.length === 2 && typeof resolved[1] === 'number') {
        const target = resolved[1];
        const current = inst.address;
        const offset = target - (current + 2);
        if (offset < -128 || offset > 127) {
          throw new Error(`Relative jump out of range: ${offset} (must be -128 to 127)`);
        }
        return encodeJR([resolved[0], offset]);
      }
      return encodeJR(resolved);
    }

    // DJNZ instruction
    if (mnemonic === 'DJNZ') {
      const savedAddr = this.currentAddress;
      this.currentAddress = inst.address;
      const resolved = this.resolveOperands(operands, inst.address);
      this.currentAddress = savedAddr;
      // Calculate relative offset
      if (typeof resolved[0] === 'number') {
        const target = resolved[0];
        const current = inst.address;
        const offset = target - (current + 2);
        if (offset < -128 || offset > 127) {
          throw new Error(`Relative jump out of range: ${offset} (must be -128 to 127)`);
        }
        return encodeDJNZ(offset);
      }
      return encodeDJNZ(resolved[0]);
    }

    // ADD HL,ss - special case for 16-bit addition
    if (mnemonic === 'ADD' && operands.length === 2 && operands[0] === 'HL') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeADDHL(resolved);
    }

    // Arithmetic/Logic operations
    if (['ADD', 'ADC', 'SUB', 'SBC', 'AND', 'OR', 'XOR', 'CP'].includes(mnemonic)) {
      const savedAddr = this.currentAddress;
      this.currentAddress = inst.address;
      const resolved = this.resolveOperands(operands, inst.address);
      this.currentAddress = savedAddr;
      return encodeALU(mnemonic, resolved);
    }

    // INC instruction
    if (mnemonic === 'INC') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeINC(resolved[0]);
    }

    // DEC instruction
    if (mnemonic === 'DEC') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeDEC(resolved[0]);
    }

    // PUSH instruction
    if (mnemonic === 'PUSH') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodePUSH(resolved[0]);
    }

    // POP instruction
    if (mnemonic === 'POP') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodePOP(resolved[0]);
    }

    // CALL instruction
    if (mnemonic === 'CALL') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeCALL(resolved);
    }

    // RET cc instruction
    if (mnemonic === 'RET') {
      if (operands.length === 0) {
        return { bytes: [0xC9], size: 1 };
      }
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeRETCC(resolved[0]);
    }

    // RST instruction
    if (mnemonic === 'RST') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeRST(resolved[0]);
    }

    // CB-prefixed instructions
    if (['RLC', 'RRC', 'RL', 'RR', 'SLA', 'SRA', 'SLL', 'SRL', 'BIT', 'SET', 'RES'].includes(mnemonic)) {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeCB(mnemonic, resolved);
    }

    // IN instruction
    if (mnemonic === 'IN') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeIN(resolved);
    }

    // OUT instruction
    if (mnemonic === 'OUT') {
      const resolved = this.resolveOperands(operands, inst.address);
      return encodeOUT(resolved);
    }

    throw new Error(`Unsupported instruction: ${mnemonic}`);
  }

  resolveOperands(operands, currentAddr) {
    return operands.map(op => {
      // Handle label references that were stored as objects in pass 2
      // These need to be resolved to addresses using the current symbol table
      if (op && typeof op === 'object' && op.type === 'LABEL_REF') {
        const symbol = this.symbolTable[op.name];
        if (symbol) {
          // Return the address from the symbol table
          return symbol.address;
        }
        throw new Error(`Undefined symbol: ${op.name}`);
      }
      
      if (typeof op === 'number') {
        return op;
      }
      if (typeof op === 'string') {
        // Check if it's a register or condition code
        if (['A', 'B', 'C', 'D', 'E', 'H', 'L', '(HL)', '(BC)', '(DE)'].includes(op)) {
          return op;
        }
        if (['NZ', 'Z', 'NC', 'C', 'PO', 'PE', 'P', 'M'].includes(op)) {
          return op;
        }
        if (['BC', 'DE', 'HL', 'SP', 'AF'].includes(op)) {
          return op;
        }
        // Try to resolve as label - use current symbol table
        const symbol = this.symbolTable[op];
        if (symbol) {
          return symbol.address;
        }
        // If not found, might be a forward reference that wasn't resolved
        // This shouldn't happen in pass 2, but handle gracefully
        throw new Error(`Undefined symbol: ${op}`);
      }
      return op;
    });
  }
}

