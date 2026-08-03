// Ship Crew Roles (profitable-design-questions.md). Pilot/Combat
// Engineer/Science Officer/Systems Engineer are open to any hired crew
// member, any tier; Crafter requires profession !== null (tier 6-7 only),
// enforced by assignToShipRole(), not by this type.
export type ShipCrewRole = "Pilot" | "Combat Engineer" | "Science Officer" | "Systems Engineer" | "Crafter";
