import { RECIPE_CHOICES, validateRecipe, type Recipe } from '../audio/recipe.js';

interface LabShare {
  readonly artifactId: string;
  readonly recipe: Recipe;
}

const prefix = '#mix=';
const recipeFields = Object.keys(RECIPE_CHOICES) as (keyof Recipe)[];

export function encodeLabShare({ artifactId, recipe }: LabShare): string {
  const ordered = Object.fromEntries(recipeFields.map((field) => [field, recipe[field]]));
  return prefix + encodeURIComponent(JSON.stringify({ artifactId, recipe: ordered }));
}

export function readLabShare(fragment: string): LabShare | null {
  if (!fragment.startsWith(prefix)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(fragment.slice(prefix.length))) as Record<
      string,
      unknown
    > | null;
    const artifactId = parsed?.artifactId;
    const recipe = parsed?.recipe;
    if (typeof artifactId !== 'string' || !/^[a-z0-9-]+$/.test(artifactId)) return null;
    if (!validateRecipe(recipe)) return null;
    return { artifactId, recipe };
  } catch {
    return null;
  }
}
