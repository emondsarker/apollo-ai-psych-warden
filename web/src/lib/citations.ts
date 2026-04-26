/**
 * Citation registry for Apollo's analyses.
 *
 * Each entry: short cite key (what Apollo emits in JSON) → human label + URL.
 * URLs are limited to verified canonical sources (organization or
 * peer-reviewed homepage) — never invented.
 */

export interface Citation {
  label: string;
  url: string;
}

export const CITATIONS: Record<string, Citation> = {
  "LIWC-22": {
    label: "Pennebaker et al. — LIWC-22 Manual",
    url: "https://www.liwc.app/static/documents/LIWC-22%20Manual%20-%20Development%20and%20Psychometrics.pdf",
  },
  "LIWC": {
    label: "Linguistic Inquiry and Word Count (LIWC)",
    url: "https://www.liwc.app/help/liwc",
  },
  "DARVO": {
    label: "Freyd, J.J. (1997) — DARVO",
    url: "https://www.jjfreyd.com/darvo",
  },
  "Stark 2007": {
    label: "Stark, E. (2007) — Coercive Control",
    url: "https://global.oup.com/academic/product/coercive-control-9780195384048",
  },
  "Coercive Control": {
    label: "Stark, E. (2007) — Coercive Control",
    url: "https://global.oup.com/academic/product/coercive-control-9780195384048",
  },
  "DSM-5-TR": {
    label: "DSM-5-TR (APA, 2022)",
    url: "https://www.psychiatry.org/psychiatrists/practice/dsm",
  },
  "C-SSRS": {
    label: "Columbia Suicide Severity Rating Scale",
    url: "https://cssrs.columbia.edu/",
  },
  "MITI 4.2.1": {
    label: "Motivational Interviewing Treatment Integrity 4.2.1",
    url: "https://casaa.unm.edu/download/MITI4_2.pdf",
  },
  "MITI": {
    label: "Motivational Interviewing Treatment Integrity",
    url: "https://casaa.unm.edu/download/MITI4_2.pdf",
  },
  "APA AI Advisory 2025": {
    label: "APA Health Advisory: AI Chatbots & Mental Health (Nov 2025)",
    url: "https://www.apa.org/topics/artificial-intelligence-machine-learning/health-advisory-ai-chatbots-wellness-apps-mental-health.pdf",
  },
  "APA AI Advisory": {
    label: "APA Health Advisory: AI Chatbots & Mental Health (Nov 2025)",
    url: "https://www.apa.org/topics/artificial-intelligence-machine-learning/health-advisory-ai-chatbots-wellness-apps-mental-health.pdf",
  },
  "Brown 2025": {
    label: "Brown 2025 — AI chatbots violate mental-health ethics standards",
    url: "https://www.brown.edu/news/2025-10-21/ai-mental-health-ethics",
  },
  "CAPE-II": {
    label: "CAPE-II framework for evaluating chatbots (2025)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12694945/",
  },
  "988 Lifeline": {
    label: "988 Suicide & Crisis Lifeline",
    url: "https://988lifeline.org/",
  },
  "APA Ethics 3.05": {
    label: "APA Ethics Code §3.05 — Multiple Relationships",
    url: "https://www.apa.org/ethics/code",
  },
  "APA Ethics 9.01": {
    label: "APA Ethics Code §9.01 — Bases for Assessments",
    url: "https://www.apa.org/ethics/code",
  },
  "APA Ethics": {
    label: "APA Ethics Code",
    url: "https://www.apa.org/ethics/code",
  },
  "Rogers 1957": {
    label: "Rogers, C.R. (1957) — necessary & sufficient conditions",
    url: "https://psycnet.apa.org/record/1959-00842-001",
  },
  "Forensic LIWC Suicide Notes": {
    label: "Forensic Linguistic Profiling of Suicide Notes (LIWC, 2024)",
    url: "https://www.researchgate.net/publication/392774906_Forensic_Linguistic_Profiling_of_Suicide_Notes_A_LIWC-Based_Analysis_of_Emotional_and_Cognitive_Markers",
  },
};

/**
 * Find the best citation match for a free-text label.
 * Returns the canonical key, or null if no clear match.
 */
export function lookupCitation(text: string): { key: string; cite: Citation } | null {
  if (!text) return null;
  const normalized = text.trim();
  // Exact key match first.
  if (CITATIONS[normalized]) return { key: normalized, cite: CITATIONS[normalized] };
  // Substring match — pick the longest matching key so "APA Ethics 3.05" wins over "APA Ethics".
  const matches = Object.keys(CITATIONS).filter((k) =>
    normalized.toLowerCase().includes(k.toLowerCase()),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.length - a.length);
  const key = matches[0];
  return { key, cite: CITATIONS[key] };
}
