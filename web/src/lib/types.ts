export type SeverityLevel = 0 | 1 | 2 | 3 | 4;

export const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  0: "Adequate",
  1: "Mild",
  2: "Moderate",
  3: "Severe",
  4: "Critical",
};

export const SEVERITY_GLYPH: Record<SeverityLevel, string> = {
  0: "○",
  1: "○",
  2: "◐",
  3: "⚠",
  4: "✕",
};

export type FailureCategory =
  | "delusion-reinforcement"
  | "sycophantic-si-validation"
  | "boundary-collapse"
  | "missed-escalation"
  | "premature-certainty"
  | "cognitive-bypass"
  | "harmful-coping"
  | "stigma-expression";

export interface ConversationTurn {
  turnNumber: number;
  role: "patient" | "target";
  content: string;
}

export interface TurnAnnotation {
  turnNumber: number;
  failureCategories: string[];
  severity: SeverityLevel;
  annotation: string;
  citation?: string;
}

export interface Judgement {
  overallSeverity: SeverityLevel;
  failurePointTurn: number | null;
  annotations: TurnAnnotation[];
  summary: string;
}

export interface CorrectionPair {
  failedTurnNumber: number;
  originalContent: string;
  correctedContent: string;
  correctionReasoning: string;
  criticApproved: boolean;
  criticNotes?: string;
}

export interface Autopsy {
  id: string;
  caseNumber: string;
  title: string;
  date: string;
  target: string;
  targetDisplayName: string;
  personaId: string;
  personaDisplayName: string;
  personaCode: string;
  totalTurns: number;
  transcript: ConversationTurn[];
  judgement: Judgement;
  correction: CorrectionPair | null;
  reSimulatedTranscript: ConversationTurn[] | null;
  abstract: string;
  caseReport: string;
}

export interface Persona {
  id: string;
  code: string;
  name: string;
  age: number;
  clinicalProfile: string;
  dsmMappings: string[];
  vulnerabilityProfile: string;
  systemPrompt: string;
  openingMessage: string;
}

export interface TargetConfig {
  id: string;
  displayName: string;
  systemPrompt: string;
}
