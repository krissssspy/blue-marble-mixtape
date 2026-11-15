import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Step {
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
  env?: Record<string, unknown>;
}

interface Job {
  if?: string;
  steps?: Step[];
  env?: Record<string, unknown>;
}

interface Workflow {
  on: {
    push?: { branches?: string[] };
    pull_request?: { branches?: string[]; types?: string[] };
  };
  permissions?: Record<string, string>;
  env?: Record<string, unknown>;
  jobs: Record<string, Job>;
}

const TOKEN = '${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}';
const DEPLOY_ACTION = 'Azure/static-web-apps-deploy@v1';

async function load(): Promise<Workflow> {
  const source = readFileSync(
    new URL('../../.github/workflows/deploy.yml', import.meta.url),
    'utf8',
  );
  const { parse } = await import('yaml');
  return parse(source) as Workflow;
}

function isDeployStep(step: Step) {
  return step.uses === DEPLOY_ACTION;
}

function findJob(workflow: Workflow, action: string) {
  return Object.values(workflow.jobs).find((job) =>
    (job.steps ?? []).some((step) => isDeployStep(step) && step.with?.action === action),
  );
}

function runLines(step: Step) {
  return (step.run ?? '').split(/\r?\n|&&/).map((line) => line.trim());
}

describe('deploy workflow', () => {
  it('runs on pushes to main and on pull requests targeting main, including closing', async () => {
    const { on } = await load();
    expect(on.push?.branches).toEqual(['main']);
    expect(on.pull_request?.branches).toEqual(['main']);
    expect(on.pull_request?.types).toEqual(
      expect.arrayContaining(['opened', 'synchronize', 'reopened', 'closed']),
    );
  });

  it('builds the site then uploads it, skipping closed pull requests', async () => {
    const workflow = await load();
    const job = findJob(workflow, 'upload');
    expect(job).toBeDefined();
    const steps = job?.steps ?? [];

    const checkout = steps.findIndex((step) => step.uses?.startsWith('actions/checkout@'));
    const setupNode = steps.findIndex((step) => step.uses?.startsWith('actions/setup-node@'));
    const install = steps.findIndex((step) => runLines(step).includes('npm ci'));
    const build = steps.findIndex((step) => runLines(step).includes('npm run build'));
    const deploy = steps.findIndex(isDeployStep);
    expect(checkout).toBeGreaterThanOrEqual(0);
    expect(setupNode).toBeGreaterThan(checkout);
    expect(install).toBeGreaterThan(setupNode);
    expect(build).toBeGreaterThan(install);
    expect(deploy).toBeGreaterThan(build);

    expect(steps[deploy]?.with).toMatchObject({
      action: 'upload',
      app_location: 'dist',
      skip_app_build: true,
      azure_static_web_apps_api_token: TOKEN,
      repo_token: '${{ secrets.GITHUB_TOKEN }}',
    });

    expect(job?.if).toBe("github.event.action != 'closed'");
  });

  it('has a separate job that closes the preview when a pull request closes', async () => {
    const workflow = await load();
    const upload = findJob(workflow, 'upload');
    const close = findJob(workflow, 'close');
    expect(close).toBeDefined();
    expect(close).not.toBe(upload);

    expect(close?.if).toBe(
      "github.event_name == 'pull_request' && github.event.action == 'closed'",
    );

    const step = (close?.steps ?? []).find(
      (candidate) => isDeployStep(candidate) && candidate.with?.action === 'close',
    );
    expect(step?.with?.azure_static_web_apps_api_token).toBe(TOKEN);
  });

  it('keeps the deployment token out of scripts and environment blocks', async () => {
    const workflow = await load();
    const secretName = 'AZURE_STATIC_WEB_APPS_API_TOKEN';
    const mentionsSecret = (value: unknown) => JSON.stringify(value ?? '').includes(secretName);

    expect(mentionsSecret(workflow.env)).toBe(false);
    let tokenInputs = 0;
    for (const job of Object.values(workflow.jobs)) {
      expect(mentionsSecret(job.env)).toBe(false);
      for (const step of job.steps ?? []) {
        expect(mentionsSecret(step.run)).toBe(false);
        expect(mentionsSecret(step.env)).toBe(false);
        expect(runLines(step).some((line) => /^echo\b/.test(line) && /secrets\./.test(line))).toBe(
          false,
        );
        for (const [key, value] of Object.entries(step.with ?? {})) {
          if (mentionsSecret(value)) {
            expect(key).toBe('azure_static_web_apps_api_token');
            expect(value).toBe(TOKEN);
            tokenInputs += 1;
          }
        }
      }
    }
    expect(tokenInputs).toBeGreaterThan(0);
  });

  it('grants only read access to contents and write access to pull requests', async () => {
    const { permissions } = await load();
    expect(permissions).toEqual({ contents: 'read', 'pull-requests': 'write' });
  });
});
