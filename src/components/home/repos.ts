/* Display names for the repositories in openSource.prs. */
const names: Record<string, string> = {
  'rubocop/rubocop': 'RuboCop',
};

export const repoName = (repo: string): string => names[repo] ?? repo.split('/').pop() ?? repo;

/** Repositories in order of first appearance, without duplicates. */
export const uniqueRepos = (prs: readonly { repo: string }[]): string[] => [...new Set(prs.map((pr) => pr.repo))];

/** The repository most pull requests went to. */
export const mainRepo = (prs: readonly { repo: string }[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const pr of prs) counts.set(pr.repo, (counts.get(pr.repo) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};
