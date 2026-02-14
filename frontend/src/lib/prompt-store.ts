const STORAGE_KEY = "prompt_manager_prompt_names";
const MAX_ITEMS = 50;

export function getPromptNames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addPromptName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const names = getPromptNames().filter((n) => n !== trimmed);
  names.unshift(trimmed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names.slice(0, MAX_ITEMS)));
}

export function removePromptName(name: string): void {
  const names = getPromptNames().filter((n) => n !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}
