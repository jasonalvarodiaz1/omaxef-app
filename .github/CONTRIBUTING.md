# Contributing to OMAXEF PA Eligibility App

## Branch Protection & CI Requirements

### Protected Branches
- `main` - Production-ready code
- `develop` - Integration branch for features

### Before Merging a PR

All pull requests must pass the following checks:

1. ✅ **Lint Check** - Code must pass ESLint with no errors
2. ✅ **Unit Tests** - All tests must pass
3. ✅ **Coverage** - Maintain minimum 70% code coverage
4. ✅ **Build** - Application must build successfully
5. ✅ **Security Scan** - No high-severity vulnerabilities

### Running Checks Locally

Before pushing your PR, run these commands:

```bash
# Run linter
npm run lint

# Fix lint issues automatically
npm run lint:fix

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the app
npm run build
```

---

# Contributing to omaxef-app

Thank you for your interest in contributing! Please follow these guidelines to help us maintain a high-quality project.

## Getting Started
- Fork the repository and clone your fork.
- Create a new branch for your feature or bugfix.
- Install dependencies with `npm install`.

## Development
- Use `npm start` to run the app locally.
- Use `npm test` to run the test suite.
- Use `npm run lint` to check for lint errors.
- Write clear, descriptive commit messages.

## Code Style
- Follow the existing code style and structure.
- Run `npm run lint:fix` before submitting a PR.
- Use descriptive variable and function names.

## Pull Requests
- Ensure all tests pass before submitting.
- Include a clear description of your changes.
- Reference related issues if applicable (e.g., `Fixes #123`).
- Keep pull requests focused and minimal.

## Reporting Issues
- Use the GitHub Issues tab to report bugs or request features.
- Provide as much detail as possible, including steps to reproduce.

## Code of Conduct
- Be respectful and inclusive.
- See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

Thank you for helping make omaxef-app better!
