import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';

const modules: string[] = [];

export function findModulePath(fuzz: string): string {
  if (modules.length === 0) {
    const repoRoot = path.join(__dirname, '..', '..');
    const lernaConfig = require(path.join(repoRoot, 'lerna.json'));
    const searchPaths: string[] = lernaConfig.packages;
    searchPaths.forEach(p => {
      const globMatches = glob.sync(path.join(repoRoot, p, 'package.json'));
      const trimmed = globMatches.map(m => path.dirname(m));
      modules.push(...trimmed);
    });
  }
  
  const regex = new RegExp(`[-_/]${fuzz}$`)
  const matched = modules.filter(m => regex.test(m));
  if (matched.length === 0) {
    throw new Error(`No module with name '${fuzz}' in the repo`);
  } else if (matched.length > 1) {
    // if multiple fuzzy matches, use an exact match
    // if there are multiple exact matches, give up and return the first
    return matched.find(m => path.basename(m) === fuzz) || matched[0];
  }
  return matched[0];
}

export function moduleStability(loc: string): 'stable' | 'experimental' | undefined {
  if (!fs.existsSync(path.join(loc, 'package.json'))) {
    throw new Error(`unexpected: no package.json found at location "${loc}"`);
  }
  const pkgjson = require(path.join(loc, 'package.json'));
  return pkgjson.stability;
}