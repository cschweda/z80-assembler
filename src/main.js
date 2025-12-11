import { Z80Assembler } from './assembler.js';
import { formatMemoryDump, formatSymbolTable, formatErrors, formatWarnings, formatBytes } from './utils/formatter.js';
import { initExamplesDropdown, getExampleById } from './ui/examples.js';

// Initialize assembler
const assembler = new Z80Assembler();

// Get DOM elements
const sourceEditor = document.getElementById('source-editor');
const outputDump = document.getElementById('output-dump');
const symbolTable = document.getElementById('symbol-table');
const errorsDisplay = document.getElementById('errors');
const warningsDisplay = document.getElementById('warnings');
const assembleBtn = document.getElementById('assemble-btn');
const exampleSelect = document.getElementById('example-select');
const statusDisplay = document.getElementById('status');

/**
 * Assemble the current source code
 */
function assemble() {
  const source = sourceEditor.value;
  
  if (!source.trim()) {
    updateStatus('No source code to assemble', 'error');
    return;
  }

  updateStatus('Assembling...', 'info');
  
  const result = assembler.assemble(source);

  // Update output
  if (result.success) {
    updateStatus(`Success! Generated ${result.bytes.length} bytes`, 'success');
    
    // Memory dump
    outputDump.textContent = formatMemoryDump(result.bytes, result.startAddress);
    
    // Symbol table
    symbolTable.textContent = formatSymbolTable(result.symbolTable);
    
    // Errors (should be none)
    errorsDisplay.textContent = formatErrors(result.errors);
    
    // Warnings
    warningsDisplay.textContent = formatWarnings(result.warnings);
  } else {
    updateStatus(`Assembly failed: ${result.errors.length} error(s)`, 'error');
    
    // Show errors
    errorsDisplay.textContent = formatErrors(result.errors);
    warningsDisplay.textContent = formatWarnings(result.warnings);
    
    // Clear outputs
    outputDump.textContent = 'Assembly failed. See errors below.';
    symbolTable.textContent = 'No symbols (assembly failed)';
  }
}

/**
 * Update status display
 */
function updateStatus(message, type = 'info') {
  statusDisplay.textContent = `Status: ${message}`;
  statusDisplay.className = `status status-${type}`;
}

/**
 * Load example program into editor
 */
function loadExample(example) {
  sourceEditor.value = example.source;
  updateStatus(`Loaded: ${example.name}`, 'info');
  
  // Clear previous outputs
  outputDump.textContent = '';
  symbolTable.textContent = '';
  errorsDisplay.textContent = '';
  warningsDisplay.textContent = '';
}

// Initialize example dropdown
initExamplesDropdown(exampleSelect, loadExample);

// Wire up assemble button
assembleBtn.addEventListener('click', assemble);

// Allow Ctrl+Enter to assemble
sourceEditor.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    assemble();
  }
});

// Initial status
updateStatus('Ready', 'info');

