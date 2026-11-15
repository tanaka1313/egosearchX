# Mandatory Guidelines for Writing Test Code

## These rules must be strictly followed!

### Test Code Quality
- Tests must verify actual functionality.
- Never write meaningless assertions such as `expect(true).toBe(true)`.
- Each test case must verify specific inputs and expected outputs.
- Keep the use of mocks to the absolute minimum; tests should reflect actual behavior as closely as possible.

### Prohibition of Hard-Coding
- Hard-coding solely to make tests pass is strictly prohibited.
- Do not include conditional branches like `if (testMode)` in production code.
- Do not embed test-specific values ​​(magic numbers) in production code.
- Properly separate test and production environments using environment variables or configuration files.

### Principles of Test Implementation
- Start with a failing test (Red-Green-Refactor).
- Ensure that boundary values, exceptional scenarios, and error cases are tested.
- Prioritize actual quality over mere code coverage.
- Clearly describe what is being tested in the test case names.

### Checks Before Implementation
- Fully understand the feature specifications before writing tests.
- If there are any uncertainties, confirm with the user rather than relying on a tentative implementation.
