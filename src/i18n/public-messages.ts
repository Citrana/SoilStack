/**
 * Message namespaces the PUBLIC site's client components use. Only these
 * are sent to visitors' browsers (CLAUDE.md, "Performance"); server
 * components read every message on the server, and the admin layout
 * provides all of them to its client components.
 * Today none: the navbar passes its labels to the phone menu and language
 * switcher as props, which keeps next-intl's message formatter out of the
 * public bundle. Prefer that; adding a namespace here ships it to everyone.
 */
export const PUBLIC_CLIENT_NAMESPACES: readonly string[] = [];

export function pickMessages<M extends Record<string, unknown>>(messages: M, namespaces: readonly string[]) {
  return Object.fromEntries(namespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]])) as Partial<M>;
}
