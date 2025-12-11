import { Z80Assembler } from '../assembler.js';
import { EXAMPLE_PROGRAMS } from '../examples/programs.js';

/**
 * Compare two byte arrays
 */
function compareBytes(actual, expected) {
  if (actual.length !== expected.length) {
    return {
      match: false,
      message: `Length mismatch: expected ${expected.length}, got ${actual.length}`
    };
  }

  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      return {
        match: false,
        message: `Byte mismatch at offset ${i}: expected 0x${expected[i].toString(16).padStart(2, '0')}, got 0x${actual[i].toString(16).padStart(2, '0')}`
      };
    }
  }

  return { match: true };
}

/**
 * Compare symbol tables
 */
function compareSymbols(actual, expected) {
  const missing = [];
  const wrong = [];

  for (const [name, expectedAddr] of Object.entries(expected)) {
    const symbol = actual[name];
    if (!symbol) {
      missing.push(name);
    } else if (symbol.address !== expectedAddr) {
      wrong.push(`${name}: expected 0x${expectedAddr.toString(16)}, got 0x${symbol.address.toString(16)}`);
    }
  }

  if (missing.length > 0 || wrong.length > 0) {
    return {
      match: false,
      message: [
        missing.length > 0 ? `Missing symbols: ${missing.join(', ')}` : '',
        wrong.length > 0 ? `Wrong addresses: ${wrong.join('; ')}` : ''
      ].filter(m => m).join(' ')
    };
  }

  return { match: true };
}

/**
 * Test a single example program
 */
function testExample(example, assembler) {
  const startTime = performance.now();
  const result = assembler.assemble(example.source);
  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);

  const testResult = {
    id: example.id,
    name: example.name,
    passed: true,
    errors: [],
    warnings: [],
    duration,
    bytesGenerated: result.bytes ? result.bytes.length : 0,
    bytesExpected: example.expectedBytes ? example.expectedBytes.length : 0,
    symbolsGenerated: result.symbolTable ? Object.keys(result.symbolTable).length : 0,
    symbolsExpected: example.expectedSymbols ? Object.keys(example.expectedSymbols).length : 0,
    result
  };

  // Check for assembly errors
  if (!result.success || result.errors.length > 0) {
    testResult.passed = false;
    testResult.errors.push(`Assembly failed: ${result.errors.map(e => e.message).join('; ')}`);
    return testResult;
  }

  // Check bytecode if expected bytes are provided
  if (example.expectedBytes !== null && example.expectedBytes !== undefined) {
    const bytesMatch = compareBytes(Array.from(result.bytes), example.expectedBytes);
    if (!bytesMatch.match) {
      testResult.passed = false;
      testResult.errors.push(`Bytecode mismatch: ${bytesMatch.message}`);
      testResult.errors.push(`Expected: ${example.expectedBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      testResult.errors.push(`Got: ${Array.from(result.bytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    }
  }

  // Check symbols
  if (example.expectedSymbols) {
    const symbolsMatch = compareSymbols(result.symbolTable, example.expectedSymbols);
    if (!symbolsMatch.match) {
      testResult.passed = false;
      testResult.errors.push(`Symbol mismatch: ${symbolsMatch.message}`);
    }
  }

  // Collect warnings
  if (result.warnings.length > 0) {
    testResult.warnings = result.warnings.map(w => w.message);
  }

  return testResult;
}

/**
 * Run the complete test suite
 */
export function runTestSuite() {
  const assembler = new Z80Assembler();
  const results = [];

  console.log('Running Z80 Assembler Test Suite...\n');

  for (const example of EXAMPLE_PROGRAMS) {
    const testResult = testExample(example, assembler);
    results.push(testResult);

    const status = testResult.passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = testResult.passed ? '\x1b[32m' : '\x1b[31m'; // Green or Red
    const resetColor = '\x1b[0m';
    
    console.log(`\n${statusColor}[${status}]${resetColor} ${testResult.name}`);
    console.log(`  ID: ${testResult.id}`);
    console.log(`  Description: ${example.description || 'N/A'}`);
    console.log(`  Duration: ${testResult.duration}ms`);
    console.log(`  Bytes: ${testResult.bytesGenerated}${testResult.bytesExpected ? ` (expected ${testResult.bytesExpected})` : ''}`);
    console.log(`  Symbols: ${testResult.symbolsGenerated}${testResult.symbolsExpected ? ` (expected ${testResult.symbolsExpected})` : ''}`);
    
    // Show first 16 bytes of generated code
    if (testResult.result.bytes && testResult.result.bytes.length > 0) {
      const preview = Array.from(testResult.result.bytes)
        .slice(0, 16)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      const more = testResult.result.bytes.length > 16 ? '...' : '';
      console.log(`  Bytecode: ${preview}${more}`);
    }
    
    // Show key symbols (up to 5)
    if (testResult.result.symbolTable && Object.keys(testResult.result.symbolTable).length > 0) {
      const symbols = Object.entries(testResult.result.symbolTable)
        .slice(0, 5)
        .map(([name, info]) => `${name}:0x${info.address.toString(16).toUpperCase()}`)
        .join(', ');
      const moreSyms = Object.keys(testResult.result.symbolTable).length > 5 ? '...' : '';
      console.log(`  Symbols: ${symbols}${moreSyms}`);
    }
    
    if (!testResult.passed) {
      console.log(`  ${statusColor}Errors:${resetColor}`);
      testResult.errors.forEach(err => console.log(`    • ${err}`));
    }
    if (testResult.warnings.length > 0) {
      console.log(`  \x1b[33mWarnings:\x1b[0m`);
      testResult.warnings.forEach(warn => console.log(`    • ${warn}`));
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + parseFloat(r.duration), 0).toFixed(2);
  const totalBytes = results.reduce((sum, r) => sum + r.bytesGenerated, 0);

  console.log('\n' + '='.repeat(70));
  console.log('                    TEST SUITE SUMMARY');
  console.log('='.repeat(70));
  
  const passColor = passed === total ? '\x1b[32m' : '\x1b[33m';
  const failColor = failed > 0 ? '\x1b[31m' : '\x1b[32m';
  const resetColor = '\x1b[0m';
  
  console.log(`  Total Tests:     ${total}`);
  console.log(`  ${passColor}Passed:${resetColor}          ${passed}`);
  console.log(`  ${failColor}Failed:${resetColor}          ${failed}`);
  console.log(`  Success Rate:    ${((passed/total)*100).toFixed(1)}%`);
  console.log(`  Total Time:      ${totalTime}ms`);
  console.log(`  Avg Time/Test:   ${(totalTime/total).toFixed(2)}ms`);
  console.log(`  Total Bytes:     ${totalBytes} (${(totalBytes/1024).toFixed(2)}KB)`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\n' + failColor + 'FAILED TESTS:' + resetColor);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n  ${failColor}✗${resetColor} ${r.name} (${r.id})`);
      r.errors.forEach(err => console.log(`    ${err}`));
    });
  } else {
    console.log(`\n${passColor}🎉 All tests passed!${resetColor}`);
  }

  return {
    total,
    passed,
    failed,
    results
  };
}

// If running in Node.js, execute tests
if (typeof window === 'undefined') {
  runTestSuite();
}

