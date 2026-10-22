export const MAP_SIZES = [12, 16, 20, 24];
export const TERRAIN_TYPES = {balanced:'균형',continents:'대륙 · 육지 많음',islands:'군도 · 바다 많음',forest:'삼림'};
export const AI_LEVELS = {easy:'쉬움',normal:'보통',hard:'어려움'};
export function gameOptions(value = {}, defaultSize = 16) {
  const size = value.size ?? defaultSize, terrain = value.terrain ?? 'balanced', difficulty = value.difficulty ?? 'normal';
  if (!MAP_SIZES.includes(size) || !Object.hasOwn(TERRAIN_TYPES,terrain) || !Object.hasOwn(AI_LEVELS,difficulty)) throw new Error('맵 크기·지형·AI 난이도를 확인하세요.');
  return {size,terrain,difficulty};
}
