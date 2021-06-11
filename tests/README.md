# Test strategy
## Unit tests
- separate pure functions from effectful functions
- mock APIs to test effectful functions

### Pure functions
- retrieveSpellingErrors

### Effectful functions
#### No mocking
- applyTextSuggestions

#### Mocking
- requestSpellChecks

Not much value to test the rest of the effectful functions. 
Best jump to integration tests and manual testing.
For the sake of time, we only did manual testing.

## Manual testing
Performed on three inputs:
- `spelling-test.docx` with two spelling errors
  - expected: 
    - speling -> spelling, wrng -> wrong, correctly replaced
    - docx file can be opened with the expected contents in it
    - docx file can be accessed with provided link
- `spelling-test-empty.docx` with no content
  - expected:
    - produced file has the same (empty) contents as input file
- `spelling-test-malformed.docx` with corrupted docx format
  - expected:
    - 400 error
    - server still on
