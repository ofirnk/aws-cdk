import * as GitHub from 'github-api';
import * as linter from '../lint';

jest.mock('github-api');

beforeEach(() => {
  GitHub.mockClear();
});

describe('breaking changes format', () => {
  test('disallow variations to "BREAKING CHANGE:"', async () => {
    const issue = {
      body: 'BREAKING CHANGES:',
      labels: [{ name: 'pr-linter/exempt-test' }, { name: 'pr-linter/exempt-readme' }]
    };
    configureMock(issue, undefined);
    await expect(linter.validatePr(1000)).rejects.toThrow(/'BREAKING CHANGE: ', variations are not allowed/);
  });

  test('the first breaking change should immediately follow "BREAKING CHANGE:"', async () => {
    const issue = {
      body: `BREAKING CHANGE: 
             * **module:** another change`,
      labels: [{ name: 'pr-linter/exempt-test' }, { name: 'pr-linter/exempt-readme' }]
    };
    configureMock(issue, undefined);
    await expect(linter.validatePr(1000)).rejects.toThrow(/description of the first breaking change should immediately follow/);
  });

  test('invalid title', async () => {
    const issue = {
      title: 'chore(foo/bar): some title',
      body: 'BREAKING CHANGE: this breaking change',
      labels: [{ name: 'pr-linter/exempt-test' }, { name: 'pr-linter/exempt-readme' }]
    };
    configureMock(issue, undefined);
    await expect(linter.validatePr(1000)).rejects.toThrow(/must specify the module name that the first breaking change/);
  });

  test('valid title', async () => {
    const issue = {
      title: 'chore(cdk-build-tools): some title',
      body: 'BREAKING CHANGE: this breaking change',
      labels: [{ name: 'pr-linter/exempt-test' }, { name: 'pr-linter/exempt-readme' }]
    };
    configureMock(issue, undefined);
    await linter.validatePr(1000); // not throw
  });
});

describe('ban breaking changes in stable modules', () => {
  test('breaking change in stable module', async () => {
    const issue = {
      title: 'chore(s3): some title',
      body: 'BREAKING CHANGE: this breaking change',
      labels: [{ name: 'pr-linter/exempt-test' }, { name: 'pr-linter/exempt-readme' }]
    };
    configureMock(issue, undefined);
    await expect(linter.validatePr(1000)).rejects.toThrow('Breaking changes in stable modules [s3] is disallowed.');
  });

  test('breaking changes mixed in stable and experimental', async () => {
    const issue = {
      title: 'chore(lambda): some title',
      body: `
        BREAKING CHANGE: this breaking change
        continued message
        * **apigatewayv2**: another breaking change here
        continued message
        * **ecs**: further breaking in ecs
      `,
      labels: [{ name: 'pr-linter/exempt-test' }, { name: 'pr-linter/exempt-readme' }]
    };
    configureMock(issue, undefined);
    await expect(linter.validatePr(1000)).rejects.toThrow('Breaking changes in stable modules [lambda, ecs] is disallowed.');
  });

  test('breaking changes only in experimental', async () => {
    const issue = {
      title: 'chore(apigatewayv2): some title',
      body: `
        BREAKING CHANGE: this breaking change
        continued message
        * **lambda-python**: another breaking change here
      `,
      labels: [{ name: 'pr-linter/exempt-test' }, { name: 'pr-linter/exempt-readme' }]
    };
    configureMock(issue, undefined);
    await linter.validatePr(1000); // not throw
  });
});

function configureMock(issue: any, prFiles: any[] | undefined) {
  GitHub.mockImplementation(() => {
    return {
      getIssues: () => {
        return {
          getIssue: () => {
            return { data: issue };
          },
        };
      },
      getRepo: () => {
        return {
          listPullRequestFiles: () => {
            return { data: prFiles };
          }
        }
      }
    };
  });
}