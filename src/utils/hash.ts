import crypto from 'crypto';
import type { Skill } from '../types/index.js';

/**
 * Calculate hash for a skill
 * Hash includes: name, description, and content
 */
export function calculateSkillHash(skill: Skill): string {
  const hashInput = `${skill.name}:${skill.description}:${skill.content}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 12);
}

/**
 * Check if two hashes match
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

/**
 * Calculate hash from string content
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}
