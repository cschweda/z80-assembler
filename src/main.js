/**
 * @fileoverview Main UI initialization and event handling
 * 
 * This is the main entry point for the browser-based Z80 assembler UI.
 * It initializes the assembler, sets up DOM element references, wires up
 * event handlers, and manages the interaction between the user interface
 * and the assembler core.
 * 
 * Features:
 * - Source code editor with keyboard shortcuts
 * - One-click assembly with results display
 * - TRS-80 DEBUG-style memory dump output
 * - Symbol table display
 * - Error and warning reporting
 * - Example program loader
 * - Status notifications
 * 
 * @module main
 * @requires ./assembler
 * @requires ./utils/formatter
 * @requires ./ui/examples
 */

import { Z80Assembler } from './assembler.js';
import { formatMemoryDump, formatSymbolTable, formatErrors, formatWarnings, formatBytes } from './utils/formatter.js';
import { initExamplesDropdown, getExampleById } from './ui/examples.js';

/**
 * Main assembler instance
 * Shared across all assembly operations
 * @type {Z80Assembler}
 */
const assembler = new Z80Assembler();

/**
 * DOM element references
 * Cached at startup for performance
 */
const sourceEditor = document.getElementById('source-editor');     // Textarea for source code
const outputDump = document.getElementById('output-dump');         // Memory dump display
const symbolTable = document.getElementById('symbol-table');       // Symbol table display
const errorsDisplay = document.getElementById('errors');           // Error messages
const warningsDisplay = document.getElementById('warnings');       // Warning messages
const assembleBtn = document.getElementById('assemble-btn');       // Assemble button
const exampleSelect = document.getElementById('example-select');   // Example dropdown
const statusDisplay = document.getElementById('status');           // Status bar

/**
 * Assembles the current source code and updates the UI with results
 * 
 * Main assembly function that:
 * 1. Validates source code is present
 * 2. Invokes the assembler
 * 3. Displays formatted results (bytecode, symbols, errors)
 * 4. Updates status indicators
 * 
 * On success, displays:
 * - TRS-80 DEBUG-style memory dump
 * - Symbol table with addresses
 * - Any warnings generated
 * 
 * On failure, displays:
 * - Error messages with line/column numbers
 * - Any warnings generated
 * 
 * @private
 * @example
 * // Called when user clicks "Assemble" button or presses Ctrl+Enter
 * assemble();
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
 * Updates the status display with a message and visual indicator
 * 
 * Changes the status bar text and applies appropriate CSS class for
 * visual feedback (info, success, error).
 * 
 * @private
 * @param {string} message - Status message to display
 * @param {'info'|'success'|'error'} [type='info'] - Status type for styling
 * 
 * @example
 * updateStatus('Assembling...', 'info');
 * updateStatus('Success! Generated 10 bytes', 'success');
 * updateStatus('Assembly failed: 2 error(s)', 'error');
 */
function updateStatus(message, type = 'info') {
  statusDisplay.textContent = `Status: ${message}`;
  statusDisplay.className = `status status-${type}`;
}

/**
 * Loads an example program into the source editor
 * 
 * Populates the editor with the example's source code and clears
 * all previous assembly outputs. Updates status to indicate which
 * example was loaded.
 * 
 * @private
 * @param {Object} example - Example program object
 * @param {string} example.name - Name of the example
 * @param {string} example.source - Z80 assembly source code
 * 
 * @example
 * // Typically called by the example dropdown
 * loadExample({
 *   name: 'Add 2+2',
 *   source: '.ORG $4200\nLD A, 2\n...'
 * });
 */
function loadExample(example) {
  sourceEditor.value = example.source;
  updateStatus(`Loaded: ${example.name}`, 'info');
  
  // Clear previous assembly outputs
  outputDump.textContent = '';
  symbolTable.textContent = '';
  errorsDisplay.textContent = '';
  warningsDisplay.textContent = '';
}

/**
 * UI Initialization
 * Sets up event handlers and initial state
 */

// Initialize example program dropdown
initExamplesDropdown(exampleSelect, loadExample);

// Wire up assemble button click handler
assembleBtn.addEventListener('click', assemble);

/**
 * Keyboard shortcut: Ctrl+Enter to assemble
 * Allows quick assembly without clicking the button
 */
sourceEditor.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    assemble();
  }
});

// Set initial status message
updateStatus('Ready', 'info');

