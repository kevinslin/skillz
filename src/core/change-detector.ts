import type { Skill, SkillChange, ChangeSummary, CacheFile } from '../types/index.js';
import { hashesMatch } from '../utils/hash.js';

/**
 * Detect changes between current skills and cache
 */
export function detectChanges(currentSkills: Skill[], cache: CacheFile): SkillChange[] {
  const changes: SkillChange[] = [];
  const cachedSkillNames = new Set(Object.keys(cache.skills));

  // Check for new and modified skills
  for (const skill of currentSkills) {
    const cachedEntry = cache.skills[skill.name];

    if (!cachedEntry) {
      // New skill
      changes.push({
        skill,
        type: 'new',
        newHash: skill.hash,
      });
    } else if (!hashesMatch(skill.hash, cachedEntry.hash)) {
      // Modified skill
      changes.push({
        skill,
        type: 'modified',
        oldHash: cachedEntry.hash,
        newHash: skill.hash,
      });
    } else {
      // Unchanged skill
      changes.push({
        skill,
        type: 'unchanged',
        oldHash: cachedEntry.hash,
        newHash: skill.hash,
      });
    }

    cachedSkillNames.delete(skill.name);
  }

  // Check for removed skills
  for (const removedName of cachedSkillNames) {
    changes.push({
      skill: null,
      type: 'removed',
      oldHash: cache.skills[removedName].hash,
    });
  }

  return changes;
}

/**
 * Check if there are any changes
 */
export function hasChanges(changes: SkillChange[]): boolean {
  return changes.some((c) => c.type !== 'unchanged');
}

/**
 * Summarize changes
 */
export function summarizeChanges(changes: SkillChange[]): ChangeSummary {
  const summary: ChangeSummary = {
    new: 0,
    modified: 0,
    removed: 0,
    unchanged: 0,
    total: changes.length,
  };

  for (const change of changes) {
    summary[change.type]++;
  }

  return summary;
}

/**
 * Filter skills by change type
 */
export function filterByChangeType(
  changes: SkillChange[],
  types: Array<'new' | 'modified' | 'removed' | 'unchanged'>
): SkillChange[] {
  return changes.filter((c) => types.includes(c.type));
}
