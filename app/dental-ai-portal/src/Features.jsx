import { theme, fonts } from "./theme.js";

const FEATURES = [
  {
    icon: <IconTarget />,
    title: "Practise under real exam pressure",
    body: "Work through the same OSCE and DTP style cases you'll face on exam day, with structured marking behind every attempt."
  },
  {
    icon: <IconBrain />,
    title: "Think like the examiner",
    body: "Get feedback on empathy, structure, history taking, diagnosis, and management — scored against the real marking matrix."
  },
  {
    icon: <IconRepeat />,
    title: "Repeat until it sticks",
    body: "Submit as many attempts as you need so weak areas become exam-ready habits, not last-minute guesses."
  }
];

export default function Features() {
  return (
    <section style={styles.section}>
      <div style={styles.grid}>
        {FEATURES.map((f) => (
          <div key={f.title} style={styles.card}>
            <div style={styles.iconWrap}>{f.icon}</div>
            <h3 style={styles.cardTitle}>{f.title}</h3>
            <p style={styles.cardBody}>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.teal} strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill={theme.teal} />
    </svg>
  );
}
function IconBrain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.teal} strokeWidth="2">
      <path d="M9 3a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5 3 3 0 0 0 2 5v1a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5 3 3 0 0 1-2 5v1a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconRepeat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.teal} strokeWidth="2">
      <path d="M17 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 22l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = {
  section: { background: theme.surface, padding: "3.5rem 1.5rem", fontFamily: fonts.body },
  grid: {
    maxWidth: 960,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20
  },
  card: {
    background: theme.white,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "1.75rem 1.5rem"
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "rgba(0, 194, 203, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: 600,
    color: theme.ink,
    margin: "0 0 8px"
  },
  cardBody: { fontSize: 14.5, lineHeight: 1.6, color: theme.slate, margin: 0 }
};
