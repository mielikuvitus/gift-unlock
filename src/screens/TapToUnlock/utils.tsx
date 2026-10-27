/**
 * Keeps the last two words on one line (NBSP) so the final line isn’t a single
 * orphan when copy wraps to two+ lines. Pair with `text-wrap: pretty` in CSS.
 */
export function avoidOrphanLastLine(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return text;
  }
  if (words.length === 2) {
    return `${words[0]}\u00a0${words[1]}`;
  }
  const head = words.slice(0, -2).join(" ");
  const tail = `${words.at(-2)}\u00a0${words.at(-1)}`;
  return `${head} ${tail}`;
}
