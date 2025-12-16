"use client";

import { useEffect, useMemo, useState } from "react";
import { getCardImagePath } from "@/lib/tarot";

type SpreadType = "one" | "three";

type EntitlementData = {
  plan: string;
  planLabel: string;
  credits: number;
  isPremium: boolean;
  hasCredits: boolean;
} | null;

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [spread, setSpread] = useState<SpreadType>("one");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [entitlement, setEntitlement] = useState<EntitlementData>(null);
  const [entLoading, setEntLoading] = useState(false);
  const [entError, setEntError] = useState<string | null>(null);

  const canRun = useMemo(() => email.includes("@"), [email]);

  // メールアドレスに応じて利用状況を取得
  useEffect(() => {
    if (!email || !email.includes("@")) {
      setEntitlement(null);
      setEntError(null);
      setEntLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      setEntLoading(true);
      setEntError(null);
      try {
        const res = await fetch("/api/entitlement/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }

        const data = await res.json();

        if (cancelled) return;

        setEntitlement({
          plan: data.plan,
          planLabel: data.planLabel,
          credits: data.credits,
          isPremium: data.isPremium,
          hasCredits: data.hasCredits,
        });
      } catch (e) {
        console.error("failed to load entitlement status", e);
        if (!cancelled) {
          setEntError("ご利用状況の取得に失敗しました。時間をおいて再度お試しください。");
          setEntitlement(null);
        }
      } finally {
        if (!cancelled) {
          setEntLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [email]);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, spread }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.badge}>Tarot</div>
          <h1 style={styles.title}>今日のタロットメッセージ（テスト）</h1>
          <p style={styles.sub}>
            1日1回の無料深掘り / チケット / 月額プレミアム対応
          </p>
        </header>

        <section style={styles.card}>
          <label style={styles.label}>メール（仮IDとして利用）</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={styles.input}
          />

          {/* ▼ ご利用状況バー */}
          <div style={styles.statusBox}>
            {!email && (
              <div style={styles.statusText}>
                メールアドレスをご入力いただくと、現在のご利用状況が表示されます。
              </div>
            )}

            {email && !email.includes("@") && (
              <div style={styles.statusText}>
                正しい形式のメールアドレスをご入力ください。
              </div>
            )}

            {email && email.includes("@") && entLoading && (
              <div style={styles.statusText}>ご利用状況を取得しています…</div>
            )}

            {email && email.includes("@") && entError && (
              <div style={styles.statusError}>{entError}</div>
            )}

            {email && email.includes("@") && entitlement && !entError && !entLoading && (
              <div>
                <div style={styles.statusTitle}>現在のご利用状況</div>
                <div style={styles.statusLine}>
                  <span style={styles.statusLabel}>ご契約プラン：</span>
                  <span style={styles.statusValue}>{entitlement.planLabel}</span>
                </div>
                <div style={styles.statusLine}>
                  <span style={styles.statusLabel}>お持ちのチケット：</span>
                  <span style={styles.statusValue}>{entitlement.credits} 枚</span>
                </div>

                {entitlement.isPremium ? (
                  <div style={styles.statusNote}>
                    プレミアムプランのため、深掘りは回数無制限でご利用いただけます。
                  </div>
                ) : entitlement.hasCredits ? (
                  <div style={styles.statusNote}>
                    チケットをご利用いただくことで、深掘りメッセージをお届けいたします。
                  </div>
                ) : (
                  <div style={styles.statusNote}>
                    深掘りをご希望の場合は、チケットのご購入または月額プランのご契約をご検討ください。
                  </div>
                )}
              </div>
            )}
          </div>
          {/* ▲ ご利用状況バー */}

          <label style={{ ...styles.label, marginTop: 14 }}>
            スプレッド
          </label>
          <div style={styles.row}>
            <button
              style={spread === "one" ? styles.toggleOn : styles.toggleOff}
              onClick={() => setSpread("one")}
            >
              1枚引き
            </button>
            <button
              style={spread === "three" ? styles.toggleOn : styles.toggleOff}
              onClick={() => setSpread("three")}
            >
              3枚引き（過去/現在/未来）
            </button>
          </div>

          <button
            onClick={run}
            disabled={!canRun || loading}
            style={{
              ...styles.primary,
              opacity: !canRun || loading ? 0.5 : 1,
            }}
          >
            {loading ? "シャッフル中..." : "占う"}
          </button>
        </section>

        {result && !result.error && (
          <section style={styles.result}>
            <div style={styles.resultHead}>
              <span style={styles.tierPill}>{result.tier}</span>
              <span style={styles.meta}>
                Plan: {result.plan} / Credits: {result.creditsLeft ?? 0}
              </span>
            </div>

            <div style={styles.spreadBox}>
              {(result.cards ?? []).map((c: any, i: number) => {
                const img = getCardImagePath(c);
                const isReversed = !!c.reversed;

                return (
                  <div key={i} style={styles.cardMini}>
                    <div
                      style={{
                        ...styles.cardImageBox,
                        transform: isReversed ? "rotate(180deg)" : "none",
                      }}
                    >
                      <img
                        src={img}
                        alt={c.name}
                        style={styles.cardImage}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/tarot/card-back.svg";
                        }}
                      />
                    </div>
                    <div style={styles.pos}>
                      {result.positions?.[i] ?? `Card ${i + 1}`}
                    </div>
                    <div style={styles.cardName}>
                      {c.name} {isReversed ? "（逆）" : "（正）"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.readingText}>{result.text}</div>

            {result.message && (
              <div style={styles.notice}>{result.message}</div>
            )}
          </section>
        )}

        {result?.error && (
          <section style={styles.error}>{result.error}</section>
        )}

        <footer style={styles.footer}>
          <a href="/pricing" style={styles.link}>
            料金ページへ
          </a>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    backgroundImage: 'url("/tarot-bg.svg")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#050516",
    color: "#f7f7ff",
    padding: "28px 16px 60px",
  },

  container: { maxWidth: 760, margin: "0 auto" },
  header: { marginBottom: 18 },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 999,
    fontSize: 12,
    letterSpacing: 1.2,
    opacity: 0.8,
  },
  title: { fontSize: 32, margin: "10px 0 6px" },
  sub: { opacity: 0.75, margin: 0 },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 18,
    backdropFilter: "blur(8px)",
  },
  label: { fontSize: 12, opacity: 0.8 },
  input: {
    width: "100%",
    padding: "12px 12px",
    fontSize: 16,
    marginTop: 6,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.2)",
    color: "white",
    outline: "none",
  },

  // ▼ ご利用状況バーまわり
  statusBox: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.35)",
    fontSize: 12,
  },
  statusTitle: {
    fontWeight: 600,
    marginBottom: 4,
  },
  statusText: {
    opacity: 0.85,
  },
  statusError: {
    color: "#fecaca",
  },
  statusLine: {
    marginTop: 2,
  },
  statusLabel: {
    opacity: 0.85,
  },
  statusValue: {
    fontWeight: 600,
  },
  statusNote: {
    marginTop: 6,
    opacity: 0.85,
  },
  // ▲ ご利用状況バーここまで

  row: {
    display: "flex",
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  toggleOn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.12)",
    color: "white",
  },
  toggleOff: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "white",
    opacity: 0.7,
  },
  primary: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 16,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background:
      "linear-gradient(90deg, rgba(150,120,255,0.35), rgba(120,200,255,0.25))",
    color: "white",
    cursor: "pointer",
  },

  result: {
    marginTop: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 18,
  },
  resultHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  tierPill: {
    padding: "3px 8px",
    fontSize: 11,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
  },
  meta: { fontSize: 12, opacity: 0.75 },

  spreadBox: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },

  cardMini: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
    width: "100%",
    maxWidth: 220,
    margin: "0 auto",
  },

  cardImageBox: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    background: "#111827",
    boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
  },
  cardImage: {
    width: "100%",
    height: "auto",
    display: "block",
    objectFit: "contain",
  },

  pos: { fontSize: 11, opacity: 0.75, marginBottom: 4 },
  cardName: { fontSize: 15 },

  readingText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
    fontSize: 15,
  },
  notice: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.8,
  },
  error: {
    marginTop: 18,
    padding: 14,
    borderRadius: 10,
    background: "rgba(255,0,0,0.08)",
    border: "1px solid rgba(255,0,0,0.25)",
  },
  footer: { marginTop: 18, opacity: 0.8 },
  link: { color: "white" },
};
