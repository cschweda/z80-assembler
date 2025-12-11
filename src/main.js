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
const charCounter = document.getElementById('char-counter');       // Character counter

// Character limit for source code (8000 chars - enough for complex programs)
const MAX_SOURCE_LENGTH = 8000;

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
 * Updates the character counter display
 * 
 * Shows remaining characters and applies visual styling based on
 * how close to the limit the user is.
 * 
 * @private
 */
function updateCharCounter() {
  const current = sourceEditor.value.length;
  const remaining = MAX_SOURCE_LENGTH - current;
  const percent = (current / MAX_SOURCE_LENGTH) * 100;
  
  // Update counter text
  charCounter.textContent = `(${current.toLocaleString()} / ${MAX_SOURCE_LENGTH.toLocaleString()} chars)`;
  
  // Update styling based on usage
  charCounter.className = 'char-counter';
  if (percent >= 95) {
    charCounter.classList.add('char-counter-danger');
  } else if (percent >= 80) {
    charCounter.classList.add('char-counter-warning');
  }
  
  // Prevent typing beyond limit
  if (current >= MAX_SOURCE_LENGTH) {
    sourceEditor.value = sourceEditor.value.substring(0, MAX_SOURCE_LENGTH);
  }
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
  updateCharCounter(); // Update counter after loading
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

// Character counter: update on input
sourceEditor.addEventListener('input', updateCharCounter);

// Handle paste to truncate if needed
sourceEditor.addEventListener('paste', (e) => {
  const paste = (e.clipboardData || window.clipboardData).getData('text');
  const current = sourceEditor.value;
  const selectionStart = sourceEditor.selectionStart;
  const selectionEnd = sourceEditor.selectionEnd;
  
  // Calculate new length after paste
  const newLength = current.length - (selectionEnd - selectionStart) + paste.length;
  
  if (newLength > MAX_SOURCE_LENGTH) {
    e.preventDefault();
    // Truncate paste to fit
    const available = MAX_SOURCE_LENGTH - (current.length - (selectionEnd - selectionStart));
    const truncated = paste.substring(0, available);
    const newValue = current.substring(0, selectionStart) + truncated + current.substring(selectionEnd);
    sourceEditor.value = newValue;
    sourceEditor.setSelectionRange(selectionStart + truncated.length, selectionStart + truncated.length);
    updateCharCounter();
    updateStatus(`Paste truncated to fit ${MAX_SOURCE_LENGTH} character limit`, 'info');
  } else {
    // Let default paste happen, then update counter
    setTimeout(updateCharCounter, 0);
  }
});

// Set initial status message and character counter
updateStatus('Ready', 'info');
updateCharCounter();

