"use client";

import { useMemo, useState } from "react";
import { getCardImagePath } from "@/lib/tarot"; // ← 追加

type SpreadType = "one" | "three";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [spread, setSpread] = useState<SpreadType>("one");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const canRun = useMemo(() => email.includes("@"), [email]);

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

            {/* ▼ カード画像付きの表示部分を変更 */}

            <div style={styles.spreadBox}>
              {(result.cards ?? []).map((c: any, i: number) => {
                const img = getCardImagePath(c);
                const isReversed = !!c.reversed; // ← 逆位置かどうか

                return (
                  <div key={i} style={styles.cardMini}>
                    <div
                      style={{
                        ...styles.cardImageBox,
                        // 逆位置のときだけカードを180度回転させる
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







            {/* ▲ ここまで */}

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
    backgroundColor: "#050516", // 読み込み前の保険
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
    maxWidth: 220,      // カードの最大横幅
    margin: "0 auto",   // 真ん中寄せ
  },

  // ▼ 追加スタイル（カード画像）
  cardImageBox: {
    width: "100%",
    // height は固定しない
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    background: "#111827",
    boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
  },
  cardImage: {
    width: "100%",
    height: "auto",      // 縦横比を保ったまま高さを決める
    display: "block",    // 余計な余白を消す
    objectFit: "contain" // 念のため
  },

  // ▲ 追加ここまで

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
