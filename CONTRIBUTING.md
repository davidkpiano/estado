# Contributing

Thank you for your interest in contributing to XState! This project is made possible by contributors like you, and we welcome any contributions to the code base and the documentation.

## Environment

- Ensure you have the latest version of Node and Yarn.
- Run `yarn` to install all needed dev dependencies.

## Making Changes

Pull requests are encouraged. If you want to add a feature or fix a bug:

1. Clone the repository
2. Create a separate branch for your changes
3. Make your changes, and ensure that it is formatted by Prettier and type-checks without errors in TypeScript
4. Write tests that validate your change and/or fix.
5. Run tests with `yarn test` (for all packages) or `yarn test:core` (for only changes to core XState)
6. Create a changeset by running `yarn changeset`. [More info](https://github.com/atlassian/changesets).
7. Push your branch and open a PR 🚀

PRs are reviewed promptly and merged in within a day or two (or even within an hour), if everything looks good.

## Setup

### Building

We are using [preconstruct](https://preconstruct.tools/) to build our packages. It comes with a handy trick which allows us to always use source files of packages contained in this monorepo. It creates hook/redirecting files in place of dist files during development. This always happens after installing packages (during `postinstall` step) and you shouldn't be worried about it, but if you actually build packages you destroy those redirecting files and to run tests, typechecking etc correctly you need to bring them back by running `yarn postinstall`.

### Publishing

We are using [changesets](https://github.com/atlassian/changesets) to create "release intents" for our packages. When those pop up on master a release PR gets prepared automatically and once it gets merged actual release happen (also automatically).
