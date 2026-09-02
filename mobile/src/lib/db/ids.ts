// UUID-ish ids generated on the phone (data-model §0) so rows sync later without
// renumbering. Time-prefixed so they sort by creation.
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
