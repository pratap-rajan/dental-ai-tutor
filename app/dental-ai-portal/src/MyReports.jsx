import { useEffect, useState } from "react";
import { theme, fonts } from "./theme.js";
import { fetchMyReports } from "./api.js";

export default function MyReports({ idToken, onBack }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchMyReports(idToken)
      .then((data) => {
        if (!cancelled) setReports(data.reports || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load reports.");
      });

    return () => { cancelled = true; };
  }, [idToken]);

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>My Reports</h2>
        <button style={styles.backButton} onClick={onBack}>&larr; Back</button>
      </div>

      <p style={styles.note}>
        Showing your most recent reports (up to the last 3 months, or 50 reports, whichever is fewer).
        View links open the printable report — use your browser's Print option to save as PDF.
      </p>

      {error && <div style={styles.errorBox}>{error}</div>}

      {!reports && !error && <div style={styles.loading}>Loading your reports…</div>}

      {reports && reports.length === 0 && (
        <div style={styles.empty}>No reports yet — complete a case to see it here.</div>
      )}

      {reports && reports.length > 0 && (
        <div style={styles.table}>
          <div style={styles.tableHeaderRow}>
            <div style={{ ...styles.cell, flex: 2 }}>Case</div>
            <div style={{ ...styles.cell, flex: 1 }}>Format</div>
            <div style={{ ...styles.cell, flex: 1.5 }}>Date</div>
            <div style={{ ...styles.cell, flex: 2 }}>Actions</div>
          </div>
          {reports.map((r, i) => (
            <div style={styles.row} key={i}>
              <div style={{ ...styles.cell, flex: 2 }}>{r.caseId}</div>
              <div style={{ ...styles.cell, flex: 1 }}>{r.assessmentType}</div>
              <div style={{ ...styles.cell, flex: 1.5 }}>
                {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : "—"}
              </div>
              <div style={{ ...styles.cell, flex: 2, display: "flex", gap: 10 }}>
                {r.viewUrl && (
                  <a href={r.viewUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
                    View / Print
                  </a>
                )}
                {r.downloadUrl && (
                  <a href={r.downloadUrl} style={styles.link}>
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: fonts.body,
    color: theme.mint
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  title: {
    fontFamily: fonts.display,
    color: theme.teal,
    fontSize: 24,
    margin: 0
  },
  backButton: {
    background: "transparent",
    border: `1px solid color-mix(in srgb, ${theme.tealGlow} 53%, transparent)`,
    color: theme.tealGlow,
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: fonts.body
  },
  note: {
    color: theme.slateLight,
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 1.5
  },
  loading: { color: theme.slateLight, fontSize: 14 },
  empty: {
    color: theme.slateLight,
    fontSize: 14,
    padding: "30px 0",
    textAlign: "center"
  },
  errorBox: {
    background: "rgba(220,38,38,0.1)",
    border: "1px solid rgba(220,38,38,0.4)",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    marginBottom: 20
  },
  table: {
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 8,
    overflow: "hidden"
  },
  tableHeaderRow: {
    display: "flex",
    background: theme.navyLight,
    padding: "10px 16px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: theme.slateLight,
    fontWeight: 600
  },
  row: {
    display: "flex",
    padding: "12px 16px",
    borderTop: `1px solid ${theme.navyLighter}`,
    fontSize: 13.5,
    alignItems: "center"
  },
  cell: { paddingRight: 10 },
  link: {
    color: theme.tealGlow,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13
  }
};