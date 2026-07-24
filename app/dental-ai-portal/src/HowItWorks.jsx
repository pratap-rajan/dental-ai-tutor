import { theme, fonts } from "./theme.js";

const STEPS = [
  {
    n: "01",
    title: "Choose your case",
    body: "Select an ORE or LDS OSCE station or DTP case based on the topic you want to strengthen."
  },
  {
    n: "02",
    title: "Record your response",
    body: "Answer as you would in the real exam, then upload your recording along with your email."
  },
  {
    n: "03",
    title: "Get structured feedback",
    body: "Receive an examiner-style scorecard by email — what you got right, what to improve, and how."
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={styles.section}>
      <div style={styles.inner}>
        <div style={styles.eyebrow}>Simple, fast, repeatable</div>
        <h2 style={styles.heading}>How it works</h2>
        <p style={styles.subhead}>
          Start in minutes and get a clear, structured path to improve after
          every attempt.
        </p>

        <div style={styles.stepsGrid}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={styles.stepCard}>
              <div style={styles.stepNumber}>{s.n}</div>
              <h3 style={styles.stepTitle}>{s.title}</h3>
              <p style={styles.stepBody}>{s.body}</p>
              {i < STEPS.length - 1 && <div style={styles.connector} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: { background: theme.navy, padding: "4rem 1.5rem", fontFamily: fonts.body },
  inner: { maxWidth: 880, margin: "0 auto", textAlign: "center" },
  eyebrow: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.teal,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: "clamp(26px, 4vw, 34px)",
    fontWeight: 600,
    color: theme.white,
    margin: "0 0 12px"
  },
  subhead: {
    fontSize: 16,
    color: theme.mint,
    opacity: 0.8,
    maxWidth: 480,
    margin: "0 auto 3rem"
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 32,
    textAlign: "left"
  },
  stepCard: { position: "relative" },
  stepNumber: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: 700,
    color: theme.teal,
    marginBottom: 12
  },
  stepTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: 600,
    color: theme.white,
    margin: "0 0 8px"
  },
  stepBody: { fontSize: 14, lineHeight: 1.6, color: theme.mint, opacity: 0.75, margin: 0 },
  connector: { display: "none" }
};
