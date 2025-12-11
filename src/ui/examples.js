/**
 * @fileoverview Example program management for the UI
 * 
 * Handles loading and displaying the 15 pre-built example programs
 * in the UI dropdown selector. Examples include everything from
 * simple programs to complex TRS-80 Model III demonstrations.
 * 
 * @module ui/examples
 * @requires ../examples/programs
 */

import { EXAMPLE_PROGRAMS } from '../examples/programs.js';

/**
 * @typedef {Object} ExampleProgram
 * @property {string} id - Unique identifier for the example
 * @property {string} name - Display name of the example
 * @property {string} description - Brief description of what the example demonstrates
 * @property {string} source - Z80 assembly source code
 * @property {Array<number>} expectedBytes - Expected bytecode output
 * @property {Object<string, number>} expectedSymbols - Expected symbol table
 */

/**
 * Initializes the example programs dropdown selector
 * 
 * Populates a <select> element with all available example programs
 * and sets up an event listener to load the selected example.
 * 
 * The dropdown shows each example with format: "Name - Description"
 * When an example is selected, the onSelect callback is invoked with
 * the complete example object.
 * 
 * @param {HTMLSelectElement} selectElement - The dropdown <select> element to populate
 * @param {Function} onSelect - Callback function invoked when an example is selected
 * @param {ExampleProgram} onSelect.example - The selected example program object
 * 
 * @example
 * const dropdown = document.getElementById('exampleSelect');
 * initExamplesDropdown(dropdown, (example) => {
 *   console.log('Selected:', example.name);
 *   sourceEditor.value = example.source;
 * });
 */
export function initExamplesDropdown(selectElement, onSelect) {
  // Clear any existing options and add placeholder
  selectElement.innerHTML = '<option value="">Select an example program...</option>';
  
  // Populate dropdown with all 15 examples
  EXAMPLE_PROGRAMS.forEach(example => {
    const option = document.createElement('option');
    option.value = example.id;
    option.textContent = `${example.name} - ${example.description}`;
    selectElement.appendChild(option);
  });
  
  // Handle selection changes
  selectElement.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
      const example = getExampleById(selectedId);
      if (example && onSelect) {
        onSelect(example);
      }
    }
  });
}

/**
 * Retrieves an example program by its unique ID
 * 
 * Searches through all available examples and returns the one matching
 * the given ID, or undefined if not found.
 * 
 * @param {string} id - Unique identifier of the example (e.g., 'add2plus2', 'fillscreen')
 * @returns {ExampleProgram|undefined} The matching example program, or undefined if not found
 * 
 * @example
 * const example = getExampleById('add2plus2');
 * if (example) {
 *   console.log(example.source);  // Displays the assembly source
 * }
 */
export function getExampleById(id) {
  return EXAMPLE_PROGRAMS.find(ex => ex.id === id);
}

/**
 * Gets all available example programs
 * 
 * Returns the complete array of all 15 example programs.
 * Useful for iteration, testing, or programmatic access.
 * 
 * @returns {Array<ExampleProgram>} Array of all example programs
 * 
 * @example
 * const examples = getAllExamples();
 * console.log(`There are ${examples.length} example programs`);
 * examples.forEach(ex => console.log(`- ${ex.name}`));
 */
export function getAllExamples() {
  return EXAMPLE_PROGRAMS;
}

