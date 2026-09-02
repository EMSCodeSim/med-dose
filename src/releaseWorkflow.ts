export const RELEASED_MEDICATION_WORKFLOW = [
  "medication",
  "concentration",
  "indication",
  "route",
  "patient",
  "safety",
  "result",
] as const;

export type ReleasedMedicationWorkflowStep = typeof RELEASED_MEDICATION_WORKFLOW[number];

export const REQUIRED_RELEASE_PATH_FIELDS = [
  "id",
  "label",
  "agent",
  "patient",
  "route",
  "formula",
  "repeat",
  "administration",
  "protocol",
] as const;
