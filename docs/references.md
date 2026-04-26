# References

Master list of real-world anchors cited across the Primum documentation and codebase. All citations have been web-verified as of Apr 22, 2026 unless marked otherwise. Entries marked **UNVERIFIED** need a final check before publication.

---

## Clinical instruments and standards

### DSM-5-TR
- **Full citation**: American Psychiatric Association. *Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition, Text Revision (DSM-5-TR)*. American Psychiatric Publishing, 2022.
- **Use in Primum**: persona symptom definitions; judge rubric for delusion, psychotic features, mood episodes.
- **Cite as**: DSM-5-TR, followed by the section or page range.

### Columbia Suicide Severity Rating Scale (C-SSRS)
- **Primary reference**: Posner K, Brown GK, Stanley B, et al. The Columbia–Suicide Severity Rating Scale: initial validity and internal consistency findings from three multisite studies with adolescents and adults. *Am J Psychiatry*. 2011;168(12):1266–1277.
- **Use in Primum**: severity scoring for suicidal-ideation-related judge decisions.
- **Status**: canonical, freely available; widely used in ED intake.

### PHQ-9
- **Primary reference**: Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. *J Gen Intern Med*. 2001;16(9):606–613.
- **Use in Primum**: depression persona construction; Item 9 as SI screen.

### MITI 4.2.1 (Motivational Interviewing Treatment Integrity)
- **Primary reference**: Moyers TB, Rollnick S, Miller WR, Manuel JK. Motivational Interviewing Treatment Integrity Coding Manual 4.2.1. Unpublished manual, 2016. (Available via University of New Mexico CASAA.)
- **Use in Primum**: therapeutic-quality dimensions for judge rubric (empathy, complex reflections, autonomy support).

### CTS-R (Cognitive Therapy Scale – Revised)
- **Primary reference**: Blackburn IM, James IA, Milne DL, et al. The revised cognitive therapy scale (CTS-R): psychometric properties. *Behav Cogn Psychother*. 2001;29(4):431–446.
- **Use in Primum**: adapted items for judging bot competence on therapy-adjacent interactions.

### APA Ethics Code
- **Full citation**: American Psychological Association. Ethical Principles of Psychologists and Code of Conduct (2017 Amendments). 2017.
- **Use in Primum**: boundary-collapse rubric; diagnostic-certainty rubric.

### 988 Suicide & Crisis Lifeline clinical guidance
- SAMHSA. *Crisis Services: Meeting Needs, Saving Lives*. Substance Abuse and Mental Health Services Administration, 2020.
- Use in Primum: escalation-signal rubric grounding.

### Joint Commission
- National Patient Safety Goal NPSG.15.01.01 — Reduce the risk for suicide.
- Use in Primum: screening-omission failure grounding.

---

## LLM safety literature

### Red-teaming methodology

- **Perez E, Huang S, Song F, Cai T, Ring R, Aslanides J, Glaese A, McAleese N, Irving G.** Red Teaming Language Models with Language Models. *Proceedings of EMNLP 2022*, pp. 3419–3448. arXiv:2202.03286. DeepMind.
  - Direct precedent for LM-as-red-teamer methodology underlying the Simulator role.
- **Ganguli D, Lovitt L, Kernion J, et al.** Red Teaming Language Models to Reduce Harms: Methods, Scaling Behaviors, and Lessons Learned. arXiv:2209.07858, 2022. Anthropic.
  - Scaling behaviors and taxonomy for red-team data.

### Sycophancy

- **Sharma M, Tong M, Korbak T, et al.** Towards Understanding Sycophancy in Language Models. arXiv:2310.13548, 2023. Anthropic.
  - Canonical paper establishing sycophancy as measurable failure mode.

### Constitutional AI / self-critique

- **Bai Y, Kadavath S, Kundu S, et al.** Constitutional AI: Harmlessness from AI Feedback. arXiv:2212.08073, 2022. Anthropic.
  - Methodological precedent for LM-as-critic + revision — architecturally parallel to Primum's Corrector + Critic roles.

### Preference optimization

- **Rafailov R, Sharma A, Mitchell E, Manning CD, Ermon S, Finn C.** Direct Preference Optimization: Your Language Model is Secretly a Reward Model. *NeurIPS 2023*. arXiv:2305.18290. Stanford.
  - Target format for Primum's correction corpus output.
- **Ouyang L, Wu J, Jiang X, et al.** Training language models to follow instructions with human feedback (InstructGPT). *NeurIPS 2022*. OpenAI.
  - RLHF canonical reference.
- **Bai Y, Jones A, Ndousse K, et al.** Training a Helpful and Harmless Assistant with Reinforcement Learning from Human Feedback. arXiv:2204.05862, 2022. Anthropic. (The HH-RLHF dataset paper.)
  - Schema precedent for Primum's corpus format.

### LLM harm taxonomy

- **Weidinger L, Uesato J, Rauh M, et al.** Taxonomy of Risks posed by Language Models. *FAccT 2022*. DOI:10.1145/3531146.3533088. DeepMind.
  - Primum extends their framework into the clinical domain.

### Mental-health specific LLM evaluation

- **Moore J, et al.** Expressing stigma and inappropriate responses prevents LLMs from safely replacing mental health providers. *FAccT 2025*. arXiv:2504.18412.
  - The **single most directly relevant paper**. Documents LLM stigma + delusion-encouragement empirically. Primum is the operational counterpart.
- **Stade EC, Stirman SW, Ungar LH, et al.** Large language models could change the future of behavioral healthcare: a proposal for responsible development and evaluation. *npj Mental Health Research*. 2024;3:12. DOI:10.1038/s44184-024-00056-z.
  - Systematic framework arguing for exactly the eval infrastructure Primum provides.

### Dataset documentation precedent

- **Gebru T, Morgenstern J, Vecchione B, et al.** Datasheets for Datasets. *Communications of the ACM*. 2021;64(12):86–92.
  - Standard for the data card accompanying Primum's corpus release.

---

## Existing red-team tooling (prior art)

- **garak** (NVIDIA, open-source) — generic LLM vulnerability scanner.
- **PyRIT** (Microsoft) — Python risk identification tool for generative AI, 2024.
- **promptfoo** (open-source) — eval harness.

Position: all three are single-turn / prompt-focused. Primum is multi-turn, clinically-grounded, and produces contrastive training pairs.

---

## Adjacent benchmarks

- **MMLU** — Hendrycks et al. 2020.
- **MedQA** — Jin et al. 2020. (Medical *knowledge*, single-turn.)
- **MedMCQA** — Pal et al. 2022.
- **PubMedQA** — Jin et al. 2019.
- **TruthfulQA** — Lin et al. 2021.
- **MT-Bench / Chatbot Arena** — Zheng et al. 2023.
- **HELM** — Liang et al. 2022. Stanford CRFM.

Position: Primum fills the missing *multi-turn clinical interaction* axis in this benchmark landscape.

---

## Regulatory hooks

### EU AI Act
- **Citation**: Regulation (EU) 2024/1689 of the European Parliament and of the Council on artificial intelligence. Official Journal of the EU, L series, 2024. In force Aug 1, 2024.
- **Relevant provisions**:
  - Article 6 — classification of high-risk AI systems
  - Annex I — AI as safety components of products subject to MDR (EU 2017/745) or IVDR (EU 2017/746)
  - Annex III — standalone high-risk categories including emotion-recognition and emergency triage
  - Article 9 — risk management system requirements
  - Article 15 — accuracy, robustness, and cybersecurity obligations
- **Compliance timeline**:
  - Aug 1, 2024: in force
  - Feb 2, 2025: prohibited-practices provisions
  - Aug 2, 2025: GPAI model obligations
  - Aug 2, 2026: most high-risk (Annex III) obligations
  - Aug 2, 2027: Annex I (MDR/IVDR-adjacent medical-device AI) obligations

### Colorado AI Act
- **Citation**: Colorado SB 24-205, "Consumer Protections for Artificial Intelligence," signed May 2024.
- **Amendment**: SB 25B-004 (signed Aug 28, 2025) postponed effective date from Feb 1, 2026 to **Jun 30, 2026**.
- **Relevant provisions**: developer and deployer duties of reasonable care; impact-assessment requirements for high-risk systems; model-card / dataset-card documentation obligations.

### US federal
- **FDA draft guidance (2024)**: "Marketing Submission Recommendations for a Predetermined Change Control Plan for AI/ML-Enabled Device Software Functions." For SaMD-classified mental-health AI this sets documentation expectations.
- **ONC HTI-1 Final Rule (2024)**: transparency requirements for predictive decision-support AI in certified EHRs. 45 CFR § 170.315(b)(11).

---

## Litigation — duty of care precedent

- **Garcia v. Character Technologies, Inc., et al.**, No. 6:24-cv-01903-ACC-DCI (M.D. Fla., filed Oct 22, 2024).
  - Wrongful-death action brought by Megan Garcia on behalf of her 14-year-old son, Sewell Setzer III. Allegations: Character.AI failed to implement adequate safeguards despite repeated expressions of suicidal ideation.
  - Settled Jan 2026 (terms undisclosed).
  - Prior to settlement, a M.D. Fla. judge ruled AI chatbots are not protected by First Amendment defenses in this context.
  - This is the concrete duty-of-care hook cited in §2 of the spec.

---

## Comparable companies / financial comps

For the writeup's single "commercial viability" sentence. Verify before citing:

- **Scale AI** — ~$14B secondary valuation (2025) — AI training data.
- **Surge AI** — multi-billion private valuation — high-quality RLHF data.
- **Mercor** — expert-labeled training data, ~$2B 2025 round.
- **Snyk** — ~$7B developer-security scanning.
- **Robust Intelligence** — acquired by Cisco, Aug 2024 (terms undisclosed but reported $400M+).
- **Drata, Vanta** — $2B+ compliance automation.

---

## Flags

- **UNVERIFIED → verify if used in demo writeup**: Freeman & Garety (2014) cognitive model of persecutory delusions citation — correct authors/era but confirm exact paper/year; Corrigan & Watson (2002) stigma framework — confirm paper/year; NICE guideline-specific citations if used.
- **Verify exact comp numbers** before putting them in the demo / writeup. These ages rapidly.
- **Always cite DSM-5-TR by section**, not just "DSM." The judge's clinical voice depends on this precision.
