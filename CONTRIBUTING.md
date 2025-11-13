# How to contribute

Open source projects always depend on the community to help improve them. Event Nest is no exception. 
All contributions are welcomed, whether it's a bug report, a feature request, or a pull request (for the ones who are feeling adventurous).

## Getting Started

1. Fork the repository and clone it locally
2. Install dependencies: `pnpm install`
3. Create a branch: `git checkout -b fix-your-feature` or `git checkout -b feat-your-feature`
4. Make your changes
5. Run tests and linting before committing

## Development

This is an Nx monorepo. Here are the most useful commands:

```bash
# Run tests for all libraries
pnpm test

# Run tests for a specific library
nx test core
nx test mongodb
nx test postgresql

# Run linting
pnpm lint

# Build a specific library
nx build core
```

## Testing

We use [Jest](https://github.com/facebook/jest) to write tests. All changes must include appropriate tests:

- **Unit tests**: For business logic and isolated components
- **Integration tests**: For database operations
- **Coverage**: PRs should not decrease overall coverage

The MongoDB and PostgreSQL libraries use test containers to run integration tests against real database instances.

## Code Style

We use [Prettier](https://prettier.io/) and eslint. Your PR must pass linting:

```bash
pnpm lint
```

## Pull Request Guidelines

- **Branch naming**: `fix-*` for bug fixes, `feat-*` for new features
- **Commit messages**: Clear and descriptive
- **Documentation**: Update README.md if you add features or change behavior
- **Tests**: Include tests for your changes
- **Coverage**: Maintain or improve test coverage

## Consistency

Follow the existing code conventions and architecture. For significant changes, open an issue first to discuss the approach.

## Questions?

Open an issue for discussion or clarification before starting work on major changes.
