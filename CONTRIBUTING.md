# How to contribute

Open source projects always depend on the community to help improve them. Event Nest is no exception. 
All contributions are welcomed, whether it's a bug report, a feature request, or a pull request (for the ones who are feeling adventurous).

The project is new so the rules will start taking shape as the project grows. For now, please follow the simple guidelines below.

## Testing

We use [Jest](https://github.com/facebook/jest) to write tests. Run our test suite with this command:

```
npm test
```

The test script is configured to produce coverage reports. If you submit a pull request, make sure that your changes don't decrease the overall coverage.

## Code Style

We use [Prettier](https://prettier.io/) and eslint to maintain code style and best practices.
Please make sure your PR adheres to the guides by running:

```
npm run lint
```

and fixing any issues that may arise.


## Consistency
Please try to follow the existing code conventions and architecture. If you have a suggestion for a change, please open an issue first to discuss it.
