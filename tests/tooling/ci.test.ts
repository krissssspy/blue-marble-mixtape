import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Step {
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
  env?: Record<string, string>;
}

interface Workflow {
  on: string | string[] | Record<string, unknown>;
  env?: Record<string, string>;
  jobs: Record<string, { steps?: Step[]; env?: Record<string, string> }>;
}

function commands(step: Step) {
  return (step.run ?? '').split(/\r?\n|&&/).map((line) => line.trim());
}

describe('pull request CI', () => {
  it('installs dependencies, runs the checks and audits the full pull request range', async () => {
    const source = readFileSync(
      new URL('../../.github/workflows/check.yml', import.meta.url),
      'utf8',
    );
    const { parse } = await import('yaml');
    const workflow: Workflow = parse(source);
    const trigger = workflow.on;
    const events =
      typeof trigger === 'string'
        ? [trigger]
        : Array.isArray(trigger)
          ? trigger
          : Object.keys(trigger);
    expect(events).toContain('pull_request');

    const jobs = Object.values(workflow.jobs);
    const steps = jobs.flatMap((job) => job.steps ?? []);
    expect(steps.some((step) => step.uses?.startsWith('actions/setup-node@'))).toBe(true);
    const shellCommands = steps.flatMap(commands);
    for (const command of [/^npm ci\b/, /^npm run check\b/, /^npm test\b/, /^npm run mutation\b/]) {
      expect(shellCommands).toContainEqual(expect.stringMatching(command));
    }

    const auditPattern = /^node\s+(?:\.\/)?tools\/hooks\/audit-history\.mjs\s/;
    const audits = jobs.flatMap((job) =>
      (job.steps ?? []).flatMap((step, index) =>
        commands(step)
          .filter((command) => auditPattern.test(command))
          .map((command) => ({ job, step, index, command })),
      ),
    );
    expect(audits.length).toBeGreaterThan(0);
    for (const { job, step, index, command } of audits) {
      expect(
        job.steps
          ?.slice(0, index)
          .some(
            (candidate) =>
              candidate.uses?.startsWith('actions/checkout@') &&
              String(candidate.with?.['fetch-depth']) === '0',
          ),
      ).toBe(true);

      const env = { ...workflow.env, ...job.env, ...step.env };
      const range = command
        .replace(
          /\$\{(\w+)\}|\$(\w+)/g,
          (reference, braced, bare) => env[braced ?? bare] ?? reference,
        )
        .replace(/\s/g, '');
      expect(range).toContain(
        '${{github.event.pull_request.base.sha}}..${{github.event.pull_request.head.sha}}',
      );
    }
  });
});
