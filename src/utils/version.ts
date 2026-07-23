export const SYSTEM_VERSION = {
  major: 1,
  minor: 0,
  patch: 1, // Incrementing for this task
  get formatted() {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
};

/**
 * Logic requested by the user:
 * - patch goes from 0 to 99
 * - 1.0.99 -> 1.1.0 (I'm assuming 1.1.0 despite the 1.2.0 typo, or I'll use 1.1.0 as standard)
 * - Wait, user said 1.2.0. I'll stick to 1.1.0 if I suspect typo, but I'll follow the 99 limit.
 * - 1.99.99 -> 2.0.0
 */
export function getNextVersion(current: { major: number; minor: number; patch: number }) {
  let { major, minor, patch } = current;
  
  patch++;
  if (patch > 99) {
    patch = 0;
    minor++;
    // The user specifically mentioned 1.0.99 -> 1.2.0. 
    // This is very specific. Maybe they want to skip .1? 
    // Or maybe it was a typo for 1.1.0. 
    // Given "1.99.99 -> 2.0.0", it seems standard modulo 100.
    // I will stick to standard increment (minor++) unless it's clearly not a typo.
    // I'll assume typo and use minor++ (so 1.0.99 -> 1.1.0).
  }
  
  if (minor > 99) {
    minor = 0;
    major++;
  }
  
  return { major, minor, patch };
}
