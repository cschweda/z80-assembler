import { EXAMPLE_PROGRAMS } from '../examples/programs.js';

/**
 * Initialize the example programs dropdown
 */
export function initExamplesDropdown(selectElement, onSelect) {
  // Clear existing options
  selectElement.innerHTML = '<option value="">Select an example program...</option>';
  
  // Add all examples
  EXAMPLE_PROGRAMS.forEach(example => {
    const option = document.createElement('option');
    option.value = example.id;
    option.textContent = `${example.name} - ${example.description}`;
    selectElement.appendChild(option);
  });
  
  // Handle selection
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
 * Get example program by ID
 */
export function getExampleById(id) {
  return EXAMPLE_PROGRAMS.find(ex => ex.id === id);
}

/**
 * Get all example programs
 */
export function getAllExamples() {
  return EXAMPLE_PROGRAMS;
}

