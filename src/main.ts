import { setFailed, info } from "@actions/core";
import { env } from "process";
import { parseInput } from "./input";
import { OctokitGitHub } from "./github";
import { Waiter } from "./wait";

(async () => {
  try {
    const input = parseInput(env);
    const github = new OctokitGitHub(input.githubToken);
    const workflows = await github.workflows(input.owner, input.repo);
    const workflow_id = workflows.find(
      (workflow) => workflow.name == input.workflowName
    )?.id;
    if (workflow_id) {
      await new Waiter(workflow_id, github, input, info).wait();
    }
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed(error?.toString() ?? "Failed with unknown error!");
    }
  }
})();
