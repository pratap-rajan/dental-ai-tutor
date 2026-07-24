import { theme, fonts } from "./theme.js";

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <img src="/assets/planore_logo.png" alt="Plan Ore" style={styles.logo} />
      <p style={styles.tagline}>Your Success, Our Priority</p>
      <p style={styles.copy}>© {new Date().getFullYear()} Plan Ore Ltd. All rights reserved.</p>
    </footer>
  );
}

const styles = {
  footer: {
    background: theme.navy,
    padding: "2.5rem 1.5rem",
    textAlign: "center",
    borderTop: `1px solid ${theme.navyLighter}`,
    fontFamily: fonts.body
  },
  logo: { width: 56, height: 56, marginBottom: 10, opacity: 0.9 },
  tagline: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: theme.teal,
    fontWeight: 500,
    margin: "0 0 6px"
  },
  copy: { fontSize: 13, color: theme.mint, opacity: 0.5, margin: 0 }
};
