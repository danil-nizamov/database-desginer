# Database Designer Test Suite

This directory contains comprehensive tests for the Database Designer application.

## Test Structure

```
tests/
├── unit/                    # Unit tests (Jest)
│   ├── app.test.js         # Core application logic
│   ├── diagram.test.js     # Diagram rendering functions
│   ├── ui.test.js          # UI utility functions
│   └── io.test.js          # Data persistence functions
├── integration/             # Integration tests (Playwright)
│   ├── user-workflows.spec.js    # End-to-end user workflows
│   └── data-persistence.spec.js  # Data persistence scenarios
├── package.json            # Test dependencies
├── playwright.config.js    # Playwright configuration
├── setup.js               # Jest setup file
└── README.md              # This file
```

## Prerequisites

- Node.js 16+ (Jest 28+ requires Node 16+)
- Python 3.7+ (for the server)

## Installation

1. Navigate to the tests directory:
   ```bash
   cd tests
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npm run install:playwright
   ```

## Running Tests

### Unit Tests

Run all unit tests:
```bash
npm test
```

Run unit tests in watch mode:
```bash
npm run test:watch
```

Run unit tests with coverage:
```bash
npm run test:coverage
```

### Integration Tests

Run all integration tests:
```bash
npm run test:integration
```

Run integration tests with UI:
```bash
npm run test:integration:ui
```

### All Tests

Run both unit and integration tests:
```bash
npm run test:all
```

## Test Categories

### Unit Tests

- **app.test.js**: Tests core business logic including schema operations, table/column management, and foreign key operations
- **diagram.test.js**: Tests SVG rendering, geometry calculations, and diagram interactions
- **ui.test.js**: Tests UI utility functions for form population and data binding
- **io.test.js**: Tests data persistence, localStorage operations, and server synchronization

### Integration Tests

- **user-workflows.spec.js**: End-to-end user scenarios including table creation, column management, foreign key relationships, and diagram interactions
- **data-persistence.spec.js**: Data persistence scenarios including auto-save, server synchronization, and error recovery

## Test Configuration

### Jest Configuration

Tests are configured in `package.json`:
- Test environment: jsdom (for DOM testing)
- Setup file: `setup.js` (mocks and global configurations)
- Coverage collection from parent directory JavaScript files
- Coverage reports in multiple formats (text, lcov, html)

### Playwright Configuration

Tests are configured in `playwright.config.js`:
- Tests run against localhost:3000
- Automatic server startup with Python server
- Multiple browser testing (Chrome, Firefox, Safari)
- HTML reporter for test results

## CI/CD Integration

Tests are automatically run on:
- Push to main/develop branches
- Pull requests to main/develop branches
- Multiple operating systems (Ubuntu, Windows, macOS)
- Multiple Node.js versions (16, 18, 20)

## Coverage Reports

Unit test coverage is generated in the `coverage/` directory:
- HTML report: `coverage/lcov-report/index.html`
- LCOV report: `coverage/lcov.info`
- Text summary in terminal

## Debugging Tests

### Unit Tests

To debug unit tests, add `debugger` statements and run:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Integration Tests

To debug integration tests:
1. Run tests in headed mode:
   ```bash
   npx playwright test --headed
   ```

2. Run tests in debug mode:
   ```bash
   npx playwright test --debug
   ```

3. Use the Playwright UI:
   ```bash
   npm run test:integration:ui
   ```

## Writing New Tests

### Unit Tests

1. Create test files in `unit/` directory
2. Follow naming convention: `*.test.js`
3. Use Jest testing framework
4. Mock external dependencies appropriately

### Integration Tests

1. Create test files in `integration/` directory
2. Follow naming convention: `*.spec.js`
3. Use Playwright testing framework
4. Test real user workflows and interactions

## Test Data

Test fixtures and mock data should be placed in a `fixtures/` directory if needed. Currently, tests use inline mock data for simplicity.

## Troubleshooting

### Common Issues

1. **Playwright browsers not installed**:
   ```bash
   npm run install:playwright
   ```

2. **Server not starting**:
   - Ensure Python 3.7+ is installed
   - Check that `server.py` is in the parent directory
   - Verify port 3000 is available

3. **Tests timing out**:
   - Increase timeout in test configuration
   - Check for infinite loops or blocking operations
   - Ensure proper async/await usage

4. **Coverage not generated**:
   - Run `npm run test:coverage`
   - Check that source files are not excluded in Jest config

## Contributing

When adding new features:
1. Write unit tests for new functions
2. Write integration tests for new user workflows
3. Ensure all tests pass before submitting PR
4. Update this README if adding new test categories or configurations
