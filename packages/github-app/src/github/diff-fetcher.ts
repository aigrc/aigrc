// ─────────────────────────────────────────────────────────────────
// PangoGuard — GitHub Diff Fetcher
// Fetches PR diffs and file contents via GitHub API
// ─────────────────────────────────────────────────────────────────

import type { Octokit } from "@octokit/rest";
import { createLogger } from "../utils/logger.js";
import { GitHubApiError } from "../utils/errors.js";

const log = createLogger("diff-fetcher");

export interface DiffFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  patch?: string;
}

/**
 * Fetch the list of changed files in a pull request.
 */
export async function fetchPullRequestFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<DiffFile[]> {
  try {
    const files: DiffFile[] = [];
    let page = 1;

    // Paginate through all files (PRs can have 3000+ files)
    while (true) {
      const response = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
        page,
      });

      for (const file of response.data) {
        files.push({
          filename: file.filename,
          status: file.status as DiffFile["status"],
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
        });
      }

      if (response.data.length < 100) break;
      page++;
    }

    log.info(`Fetched ${files.length} files from PR #${prNumber}`);
    return files;
  } catch (error) {
    throw new GitHubApiError(
      `Failed to fetch PR files: ${error instanceof Error ? error.message : String(error)}`,
      { owner, repo, prNumber }
    );
  }
}

/**
 * Fetch the content of a single file from a repository.
 */
export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string | null> {
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(ref && { ref }),
    });

    if ("content" in response.data && response.data.type === "file") {
      return Buffer.from(response.data.content, "base64").toString("utf-8");
    }

    return null;
  } catch (error: any) {
    if (error.status === 404) return null;
    throw new GitHubApiError(
      `Failed to fetch file content: ${error.message}`,
      { owner, repo, path }
    );
  }
}

/**
 * Fetch the content of multiple files in parallel.
 */
export async function fetchMultipleFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  paths: string[],
  ref?: string,
  concurrency: number = 10
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Process in batches for rate limiting
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (path) => {
        const content = await fetchFileContent(octokit, owner, repo, path, ref);
        return { path, content };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value.content !== null) {
        results.set(result.value.path, result.value.content);
      }
    }
  }

  log.info(`Fetched ${results.size}/${paths.length} file contents`);
  return results;
}
