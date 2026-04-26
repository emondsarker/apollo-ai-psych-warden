import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DocsHeader, DocsSection, DocsProse, DocsCode } from "@/components/Docs";
import { loadAllCases } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
};

export default async function AboutPage() {
  const cases = await loadAllCases();
  const inReview = cases.filter(
    (c) => c.correction !== null && !c.correction.criticApproved,
  ).length;

  return (
    <AppShell
      active="about"
      crumbs={[{ label: "About" }]}
      counts={{ cases: cases.length, review: inReview }}
    >
      <DocsHeader
        title="About Primum"
        lede="A clinical-autopsy system for conversational AI in mental-health contexts. Every documented failure becomes a billable artifact: cite it, correct it, peer-review the correction, ship it as a contrastive training pair."
      />

      <DocsSection title="Premise — sycophancy is a clinical failure, not a personality trait.">
        <DocsProse>
          <p style={{ margin: "0 0 14px" }}>
            When a deployed language model tells a person who reports hearing
            their spouse hide recording devices in the vents that they should
            <em> trust their instincts</em>, that is not a UX issue. It is{" "}
            <strong>delusion reinforcement</strong>, and there is published
            clinical guidance on why it harms.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            When a depressed user obliquely discloses passive suicidal ideation
            and the bot responds with &quot;that sounds really hard, what do
            you think might help?&quot;, that is not empathy. It is{" "}
            <strong>missed escalation</strong>, and the C-SSRS coding manual
            tells us exactly how it should have been handled.
          </p>
          <p style={{ margin: 0 }}>
            Primum extends Moore et al. (FAccT 2025), who document that current
            language models express stigma toward mental-health conditions and
            encourage delusional thinking when deployed in therapy-style
            contexts, attributing the behavior to{" "}
            <strong>sycophancy</strong>. That finding is the floor we built on.
            What we add is operational: a standing, reproducible evaluation
            framework, a clinical rubric grounded in published instruments,
            and a corpus engineers can train against.
          </p>
        </DocsProse>
      </DocsSection>

      <DocsSection
        title="The pipeline, in one paragraph"
        subtitle="Fuller treatment in /methodology."
      >
        <DocsProse>
          <p style={{ margin: 0 }}>
            A clinically grounded simulated patient persona meets a deployed
            chatbot system prompt. The encounter runs for up to twenty turns. A{" "}
            <strong>Judge</strong> model audits each target turn against
            DSM-5-TR / C-SSRS / MITI 4.2.1, identifies the failure point, and
            assigns a severity. A <strong>Corrector</strong> drafts a
            clinically sound replacement; a <strong>Critic</strong>{" "}
            peer-reviews it. A <strong>Re-simulator</strong> replays the
            patient persona forward against the corrected turn so the
            trajectory divergence is visible. Approved pairs are emitted in
            DPO, HH-RLHF, and chat-template formats.
          </p>
        </DocsProse>
      </DocsSection>

      <DocsSection title="Honest limits — what this is not">
        <DocsProse>
          <p style={{ margin: "0 0 14px" }}>
            <strong>
              Primum is clinically grounded but not clinically validated.
            </strong>{" "}
            Every rubric category cites a published instrument or peer-reviewed
            finding. None of the case-level annotations has undergone formal
            IRB review. The personas are authored against published criteria;
            they are not real patients. Validation against human-coder
            agreement is future work.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            We are deliberately publishing in a pre-print register: open,
            documented, correctable, useful now. If you find a case we got
            wrong, or a category we are mis-applying, the autopsy format is
            designed to make that argument legible.
          </p>
          <p style={{ margin: 0 }}>
            The corpus is <em>not</em> a substitute for clinical judgement, an
            FDA-cleared instrument, or a professional assessment tool. It is
            training data for safer language models, scored against the kinds
            of harms language models are currently producing in the wild.
          </p>
        </DocsProse>
      </DocsSection>

      <DocsSection title="Built with Opus 4.7">
        <DocsProse>
          <p style={{ margin: "0 0 14px" }}>
            Primum was built for <em>Built with Opus 4.7</em>, Anthropic&rsquo;s
            April 2026 hackathon. The pipeline calls{" "}
            <DocsCode>claude-opus-4-7</DocsCode> via the Anthropic SDK for the
            Persona, Judge, Corrector, Critic, and Re-simulator stages, and{" "}
            <DocsCode>claude-haiku-4-5</DocsCode> for cheap target-bot smoke
            tests. The web console is Next.js 16 with App Router and
            statically-prerendered case pages.
          </p>
          <p style={{ margin: 0 }}>
            All code is MIT-licensed. The corpus is MIT-licensed. Personas,
            target system prompts, and the rubric are documented inline in the
            repo so the work is forkable end-to-end.
          </p>
        </DocsProse>
      </DocsSection>

      <DocsSection title="Prior art">
        <ol
          style={{
            margin: 0,
            paddingLeft: 22,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-1)",
            maxWidth: "70ch",
          }}
        >
          <li style={{ marginBottom: 8 }}>
            <strong>Moore J, et al.</strong> Expressing stigma and inappropriate
            responses prevents LLMs from safely replacing mental health
            providers. <em>FAccT 2025.</em> arXiv:2504.18412.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Sharma M, Tong M, Korbak T, et al.</strong> Towards
            Understanding Sycophancy in Language Models. arXiv:2310.13548, 2023.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Bai et al.</strong> Constitutional AI: Harmlessness from AI
            Feedback. arXiv:2212.08073, 2022.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>American Psychiatric Association.</strong>{" "}
            <em>Diagnostic and Statistical Manual of Mental Disorders</em>,
            Fifth Edition, Text Revision (DSM-5-TR). 2022.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Posner K, Brent D, Lucas C, et al.</strong>{" "}
            <em>Columbia-Suicide Severity Rating Scale (C-SSRS).</em> 2008.
          </li>
          <li>
            <strong>Moyers TB, Rollnick S, Miller WR, Manuel JK.</strong>{" "}
            <em>
              Motivational Interviewing Treatment Integrity Coding Manual
              4.2.1.
            </em>{" "}
            2016.
          </li>
        </ol>
      </DocsSection>

      <DocsSection title="If you find something wrong">
        <DocsProse>
          <p style={{ margin: "0 0 12px" }}>
            If you believe a case mis-identifies a failure mode, mis-cites a
            published instrument, or assigns the wrong severity, the autopsy
            format is the artifact you should engage with. File an issue
            against the repo, naming the case number, the disputed annotation,
            and the citation you would substitute.
          </p>
          <p style={{ margin: 0, color: "var(--text-3)" }}>
            &ldquo;Open access&rdquo; here means you are invited to argue with us.
          </p>
        </DocsProse>
      </DocsSection>
    </AppShell>
  );
}
