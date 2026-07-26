// Deliberately minimal for MVP -- no modifiers, seasons, or tier fields yet.
// Do not add speculative fields for post-MVP planet mechanics.
export interface Planet {
  id: string;
  name: string;
  producibleResourceIds: string[];
}
