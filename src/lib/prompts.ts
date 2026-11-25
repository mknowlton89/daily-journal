const PROMPTS = [
  "What drained my energy today, and what helped recharge me?",
  "What do I really want in my life right now, separate from other people's expectations?",
  "What is one pattern or habit I'm noticing in my week so far?",
  "What am I holding onto out of comfort, fear, or habit that I'm ready to let go of?",
  "What is one small win or good thing I have today that I didn't have a year ago?",
  "Where could I set a clearer boundary or say \"no\" to protect my time and focus?",
  "If I repeated this week's routine for the next several years, where would it lead me?",
  "What did I avoid today, and what was underneath that avoidance?",
  "How would I talk to myself right now if I were speaking to a close friend?",
  "What is one small, practical action I can take tomorrow to move forward?",
] as const;

function hashDate(dateKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < dateKey.length; index += 1) {
    hash ^= dateKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function promptForDate(dateKey: string) {
  const index = hashDate(dateKey) % PROMPTS.length;
  return PROMPTS[index];
}

export function rerollPrompt(
  current: string,
  random: () => number = Math.random
) {
  if (PROMPTS.length < 2) return current;
  const currentIndex = PROMPTS.indexOf(current as (typeof PROMPTS)[number]);
  const roll = Math.floor(random() * (PROMPTS.length - 1));
  const nextIndex =
    currentIndex === -1
      ? Math.min(PROMPTS.length - 1, Math.floor(random() * PROMPTS.length))
      : roll >= currentIndex
        ? roll + 1
        : roll;
  return PROMPTS[nextIndex];
}

export const EMPTY_ENTRY_PLACEHOLDER =
  "Press / to insert blocks, or type /prompt for a new idea";

export function promptPlaceholder({
  nodeName,
  entryIsEmpty,
}: {
  nodeName: string;
  entryIsEmpty: boolean;
}) {
  if (!entryIsEmpty || nodeName !== "paragraph") return "";
  return EMPTY_ENTRY_PLACEHOLDER;
}
