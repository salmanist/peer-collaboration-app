// Guidance text for the FYP Roadmap screen. Edit the copy here — titles,
// summaries, tips — without touching RoadmapScreen.tsx's rendering code.
export interface RoadmapStage {
  title: string;
  timeframe: string;
  summary: string;
  tips: string[];
}

export const roadmapIntro =
  "A Final Year Project moves through the same handful of stages regardless of topic. " +
  "This roadmap lays them out in order so you always know what's next, what your supervisor " +
  "will expect to see, and what to upload to the Digital Library once it's done.";

export const roadmapStages: RoadmapStage[] = [
  {
    title: "Idea & Proposal",
    timeframe: "Weeks 1-3",
    summary:
      "Pick a problem worth solving, not just a technology you want to try. Write a one-page " +
      "proposal covering the problem statement, why it matters, and a rough plan for solving it. " +
      "Your supervisor signs off here before any real work starts.",
    tips: [
      "Search the Digital Library first — avoid repeating a project that's already been done at your department.",
      "Keep the proposal to one page. If you can't explain the idea in one page, it isn't focused enough yet.",
      "Get supervisor approval in writing before starting development — verbal 'sounds good' isn't enough.",
    ],
  },
  {
    title: "Requirements (SRS)",
    timeframe: "Weeks 3-5",
    summary:
      "Turn the approved idea into a Software Requirements Specification: functional requirements, " +
      "non-functional requirements, and the scope boundary — what the system will and won't do. " +
      "This document is what your final defense gets measured against, so be precise.",
    tips: [
      "Write requirements as testable statements ('the system shall...'), not vague goals.",
      "Explicitly list what's out of scope — it stops scope creep later and protects your timeline.",
      "Have your supervisor review the SRS before moving to design; changes here are cheap, changes later aren't.",
    ],
  },
  {
    title: "Design",
    timeframe: "Weeks 5-7",
    summary:
      "Design the system before writing code: architecture diagram, database/ER design, and UI " +
      "wireframes. For a multi-module app, this is also where you define how modules stay " +
      "independent of each other.",
    tips: [
      "Draw the architecture diagram first — it exposes integration problems before they cost you rework.",
      "Keep modules loosely coupled so one team member's work doesn't block another's.",
      "Low-fidelity wireframes are enough at this stage — don't polish UI before the flow is validated.",
    ],
  },
  {
    title: "Development",
    timeframe: "Weeks 7-12",
    summary:
      "Build in small, working increments rather than one long push. Commit often, keep a shared " +
      "task board, and integrate your module with the rest of the app early instead of at the end.",
    tips: [
      "Ship one working feature at a time — a half-built feature blocks testing and demos.",
      "Integrate with your partner's module every week, not in the final week.",
      "Write code you can explain line-by-line in your defense — copied code you don't understand is a red flag to examiners.",
    ],
  },
  {
    title: "Testing & QA",
    timeframe: "Weeks 12-13",
    summary:
      "Test against the requirements you wrote in the SRS, not just the happy path. Fix what's " +
      "broken before documentation — a working app is the whole point of the roadmap.",
    tips: [
      "Test edge cases: empty states, bad input, slow networks — not just the demo flow.",
      "Ask someone outside your team to use the app once — they'll break things you didn't think to try.",
      "Log bugs as you find them so nothing gets forgotten before the defense.",
    ],
  },
  {
    title: "Documentation",
    timeframe: "Weeks 13-14",
    summary:
      "Write the final report: introduction, literature review, methodology, results, and " +
      "conclusion. Documentation is graded as heavily as the working system, so budget real time " +
      "for it instead of writing it the night before.",
    tips: [
      "Start the report early and update it as you go — reconstructing decisions from memory later wastes time.",
      "Include screenshots and diagrams; examiners skim text but look closely at visuals.",
      "Proofread for consistency between the SRS, the design, and what was actually built.",
    ],
  },
  {
    title: "Defense & Submission",
    timeframe: "Week 15",
    summary:
      "Present the finished project to your evaluation committee, then submit the source code, " +
      "report, and a short abstract to the Digital Library so future students can build on your work.",
    tips: [
      "Rehearse the demo on the exact device/network you'll use on the day — live demos fail on unfamiliar setups.",
      "Prepare for 'why' questions, not just 'what' questions — examiners probe design decisions.",
      "Upload to the Digital Library promptly after approval; a project isn't done until it's discoverable.",
    ],
  },
];
