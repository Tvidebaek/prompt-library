export type PromptStatus = "draft" | "optimized";

export type Folder = {
  id: string;
  name: string;
  color: string;
};

export type Prompt = {
  id: string;
  title: string;
  content: string;
  folderId: string;
  category: string;
  tags: string[];
  status: PromptStatus;
  createdAt: string;
  updatedAt: string;
  optimizedContent?: string;
  optimizationNotes?: string[];
};

export const defaultFolders: Folder[] = [
  { id: "growth", name: "Growth", color: "#2f7d6d" },
  { id: "product", name: "Product", color: "#4059ad" },
  { id: "writing", name: "Writing", color: "#bb5a3a" },
  { id: "research", name: "Research", color: "#8a6f2a" }
];

export const defaultPrompts: Prompt[] = [
  {
    id: "prompt-1",
    title: "Landing Page Critique",
    content:
      "Review this landing page copy for clarity, credibility, conversion friction, and missing proof. Return the top five fixes in priority order.",
    folderId: "growth",
    category: "Marketing",
    tags: ["copy", "conversion", "critique"],
    status: "optimized",
    createdAt: "2026-05-01T09:30:00.000Z",
    updatedAt: "2026-05-14T11:10:00.000Z",
    optimizedContent:
      "Act as a senior conversion strategist. Review the landing page copy below for clarity, credibility, conversion friction, audience fit, and missing proof. Return: 1) the five highest-impact fixes in priority order, 2) the reason each fix matters, and 3) suggested replacement copy where useful.",
    optimizationNotes: [
      "Added role and evaluation criteria.",
      "Requested prioritized output and replacement copy."
    ]
  },
  {
    id: "prompt-2",
    title: "Feature Scope Guard",
    content:
      "Turn this feature idea into acceptance criteria, non-goals, edge cases, and test notes. Keep the scope tight.",
    folderId: "product",
    category: "Planning",
    tags: ["linear", "acceptance criteria", "scope"],
    status: "draft",
    createdAt: "2026-05-03T13:15:00.000Z",
    updatedAt: "2026-05-08T08:45:00.000Z"
  },
  {
    id: "prompt-3",
    title: "Voice-Matched Rewrite",
    content:
      "Rewrite the following draft in a direct, warm, practical voice. Preserve meaning, cut fluff, and keep the reader moving.",
    folderId: "writing",
    category: "Editing",
    tags: ["rewrite", "tone", "editing"],
    status: "draft",
    createdAt: "2026-05-05T10:00:00.000Z",
    updatedAt: "2026-05-15T16:25:00.000Z"
  },
  {
    id: "prompt-4",
    title: "Research Brief Builder",
    content:
      "Create a concise research brief from these notes. Include the core question, strongest evidence, gaps, risks, and recommended next steps.",
    folderId: "research",
    category: "Synthesis",
    tags: ["research", "brief", "analysis"],
    status: "optimized",
    createdAt: "2026-05-07T14:40:00.000Z",
    updatedAt: "2026-05-16T09:35:00.000Z",
    optimizedContent:
      "Act as a research lead. Create a concise research brief from the notes below. Include: core question, key findings, strongest evidence, known gaps, risks or caveats, recommended next steps, and a one-paragraph executive summary.",
    optimizationNotes: ["Clarified role.", "Added executive summary and caveats."]
  }
];

export const categories = [
  "Marketing",
  "Planning",
  "Editing",
  "Synthesis",
  "Engineering",
  "Operations"
];
