// Named demo personas — each maps to a hand-crafted set of preferred sessions.
// Designed so the broken INITIAL_ASSIGNMENTS creates visible problems for each persona,
// and the 3 DEMO_MOVES directly improve their journeys.
export const PERSONAS = [
  {
    id: "prosper",
    name: "Prosper Maxwell",
    role: "Fullstack Developer",
    interests: ["AI", "React", "TypeScript"],
    avatar: "💻",
    prefs: ["s01", "s06", "s10"],
    // INITIAL: s06 conflicts with s10 at 11:00 (same slot) + s01 overflows The Loft
    // GOOD:    9:00 LLMs@Main, 11:00 TypeScript@Beta, 13:00 React@Main — zero issues
  },
  {
    id: "zara",
    name: "Zara Ibrahim",
    role: "ML Engineer",
    interests: ["LLMs", "Fine-tuning", "AI Research"],
    avatar: "🔬",
    prefs: ["s01", "s02", "s03"],
    // INITIAL: s01 and s02 both at 16:00 — misses one AI talk; both rooms overflow
    // GOOD:    9/10/11 clean — but 3 back-to-back → fatigue warning
  },
  {
    id: "emeka",
    name: "George Peters",
    role: "Startup Founder",
    interests: ["AI", "Career Growth", "Side Projects"],
    avatar: "🚀",
    prefs: ["s01", "s16", "s20"],
    // INITIAL: s01 conflicts with s16 at 16:00; s01 overflowing
    // GOOD:    9:00 LLMs, 10:00 Side Projects, 16:00 CTO — large midday gap (networking)
  },
  {
    id: "kola",
    name: "Kola Hassan",
    role: "Backend Engineer",
    interests: ["Databases", "Data Pipelines", "Open Source"],
    avatar: "🏗",
    prefs: ["s11", "s13", "s12"],
    // Always clean: s11@9, s12@10, s13@15 — none of these sessions move in the demo
  },
  {
    id: "aisha",
    name: "Aisha Ismaila",
    role: "Engineering Manager",
    interests: ["Career", "Leadership", "Team Wellbeing"],
    avatar: "📋",
    prefs: ["s16", "s17", "s19"],
    // Always clean: s19@9, s17@14, s16@16 — but large 9→14 gap flags a networking window
  },
];
