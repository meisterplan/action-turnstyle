import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { debug, warning } from "@actions/core";

export interface Workflow {
  id: number;
  name: string;
}

export interface Run {
  id: number;
  status: string | null;
  html_url: string;
}

export interface GitHub {
  workflows: (owner: string, repo: string) => Promise<Array<Workflow>>;
  runs: (
    owner: string,
    repo: string,
    branch: string | undefined,
    workflow_id: number
  ) => Promise<Run[]>;
}

export class OctokitGitHub implements GitHub {
  private readonly octokit: Octokit;
  constructor(githubToken: string) {
    Octokit.plugin(require("@octokit/plugin-throttling"));
    this.octokit = new Octokit({
      auth: githubToken,
      throttle: {
        onRateLimit: (retryAfter, options) => {
          warning(
            `Request quota exhausted for request ${options.method} ${options.url}`
          );

          if (options.request.retryCount === 0) {
            // only retries once
            debug(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onAbuseLimit: (retryAfter, options) => {
          // does not retry, only logs a warning
          debug(`Abuse detected for request ${options.method} ${options.url}`);
        },
      },
    });
  }

  workflows = async (owner: string, repo: string) => {
    const options: RestEndpointMethodTypes["actions"]["listRepoWorkflows"]["parameters"] =
      {
        owner,
        repo,
      };
    return this.octokit.paginate<Workflow>(
      this.octokit.actions.listRepoWorkflows.endpoint.merge(options)
    );
  };

  runs = async (
    owner: string,
    repo: string,
    branch: string | undefined,
    workflow_id: number
  ) => {
    const options: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["parameters"] =
      {
        owner,
        repo,
        workflow_id,
        branch,
        per_page: 100,
      };
    return (await this.octokit.actions.listWorkflowRuns(options)).data
      .workflow_runs;
  };
}
