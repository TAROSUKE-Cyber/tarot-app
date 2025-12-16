"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PurchaseType = "single" | "ticket10" | "subMonthly";

type EntitlementData = {
  plan: string;
  planLabel: string;
  credits: number;
  isPremium: boolean;
  hasCredits: boolean;
} | null;

// 決済開始
async function startCheckout(email: string, type: PurchaseType) {
  if (!email || !email.includes("@")) {
    alert("メールアドレスを正しく入力してください。");
    return;
  }

  // 決済に使用するメールアドレスを保存（決済後の状態表示に使う）
  if (typeof window !== "undefined") {
    localStorage.setItem("tarotEmail", email);
  }

  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    alert("チェックアウト開始に失敗しました");
  }
}

// サブスク管理ポータル
async function openPortal(email: string) {
  if (!email || !email.includes("@")) {
    alert("メールアドレスを正しく入力してください。");
    return;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("tarotEmail", email);
  }

  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    alert("ポータルの取得に失敗しました");
  }
}

export default function PricingPage() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "1";
  const isCanceled = searchParams.get("canceled") === "1";

  const [email, setEmail] = useState("");
  const [entitlement, setEntitlement] = useState<EntitlementData>(null);
  const [entLoading, setEntLoading] = useState(false);
  const [entError, setEntError] = useState<string | null>(null);

  const canBuy = useMemo(() => email.includes("@"), [email]);

  // 初回マウント時に localStorage からメールアドレスを復元
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("tarotEmail");
    if (stored && stored.includes("@")) {
      setEmail(stored);
    }
  }, []);

  // メールアドレスと success パラメータに応じて現在のご利用状況を取得
  useEffect(() => {
    if (!email || !email.includes("@")) {
      setEntitlement(null);
      setEntError(null);
      return;
    }

    // 「success=1」のときは積極的に取得したいので、常に取得
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
        if (!res.ok) throw new Error(`status ${res.status}`);

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
        if (!cancelled) setEntLoading(false);
      }
    };

    // 決済成功時 or ユーザーがメールを変更したときに取得
    if (isSuccess || email) {
      fetchStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [email, isSuccess]);

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>タロットプレミアム料金</h1>
          <p style={styles.sub}>
            メールアドレスを仮のユーザーIDとして利用します。
          </p>
        </header>

        {/* 決済結果メッセージ */}
        {(isSuccess || isCanceled) && (
          <section style={styles.messageSection}>
            {isSuccess && (
              <div style={styles.successMessage}>
                決済が正常に完了しました。現在のご利用状況を反映しています。
              </div>
            )}
            {isCanceled && (
              <div style={styles.cancelMessage}>
                決済はキャンセルされました。必要であれば、再度お手続きをお願いいたします。
              </div>
            )}
          </section>
        )}

        {/* メール入力＆現在のご利用状況 */}
        <section style={styles.card}>
          <label style={styles.label}>メールアドレス</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="あなた@example.com"
            style={styles.input}
          />
          <p style={styles.note}>
            3枚引きは無料でもご利用いただけます。将来的にケルト十字などをプレミアム限定にすることもできます。
          </p>

          {/* ご利用状況ボックス */}
          <div style={styles.statusBox}>
            {!email && (
              <div style={styles.statusText}>
                メールアドレスをご入力いただくと、現在のご利用状況が表示されます。
              </div>
            )}

            {email && !email.includes("@") && (
              <div style={styles.statusError}>
                正しい形式のメールアドレスをご入力ください。
              </div>
            )}

            {email && email.includes("@") && entLoading && (
              <div style={styles.statusText}>ご利用状況を取得しています…</div>
            )}

            {email && email.includes("@") && entError && (
              <div style={styles.statusError}>{entError}</div>
            )}

            {email &&
              email.includes("@") &&
              entitlement &&
              !entError &&
              !entLoading && (
                <div>
                  <div style={styles.statusTitle}>現在のご利用状況</div>
                  <div style={styles.statusLine}>
                    <span style={styles.statusLabel}>ご契約プラン：</span>
                    <span style={styles.statusValue}>
                      {entitlement.planLabel}
                    </span>
                  </div>
                  <div style={styles.statusLine}>
                    <span style={styles.statusLabel}>お持ちのチケット：</span>
                    <span style={styles.statusValue}>
                      {entitlement.credits} 枚
                    </span>
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
        </section>

        {/* プラン一覧 */}
        <section style={styles.grid}>
          {/* 単発 */}
          <div style={styles.planCard}>
            <div style={styles.planHeader}>
              <div style={styles.planName}>単発</div>
              <div style={styles.planPrice}>1回深掘り</div>
            </div>
            <ul style={styles.list}>
              <li>・今日だけじっくり占いたいときに</li>
              <li>・お試しでプレミアムを体験したい方向け</li>
            </ul>
            <button
              style={{
                ...styles.button,
                ...(canBuy ? {} : styles.buttonDisabled),
              }}
              onClick={() => canBuy && startCheckout(email, "single")}
              disabled={!canBuy}
            >
              この内容で決済する
            </button>
          </div>

          {/* チケット10回 */}
          <div style={styles.planCard}>
            <div style={styles.planHeader}>
              <div style={styles.planName}>チケット</div>
              <div style={styles.planPrice}>10回深掘り</div>
            </div>
            <ul style={styles.list}>
              <li>・何度も相談したい方向け</li>
              <li>・家族や友達と一緒に使ってもOK</li>
            </ul>
            <button
              style={{
                ...styles.button,
                ...(canBuy ? {} : styles.buttonDisabled),
              }}
              onClick={() => canBuy && startCheckout(email, "ticket10")}
              disabled={!canBuy}
            >
              10回分を購入する
            </button>
          </div>

          {/* 月額プレミアム */}
          <div style={styles.planCard}>
            <div style={styles.planHeader}>
              <div style={styles.planName}>月額プレミアム</div>
              <div style={styles.planPrice}>使い放題に近いプラン</div>
            </div>
            <ul style={styles.list}>
              <li>・毎日のように占いたい方向け</li>
              <li>・今後の新スプレッドも優先的に開放予定</li>
            </ul>
            <button
              style={{
                ...styles.button,
                ...(canBuy ? {} : styles.buttonDisabled),
              }}
              onClick={() => canBuy && startCheckout(email, "subMonthly")}
              disabled={!canBuy}
            >
              月額プランに申し込む
            </button>
          </div>
        </section>

        <section style={styles.footerSection}>
          <button
            style={{
              ...styles.secondaryButton,
              ...(canBuy ? {} : styles.buttonDisabled),
            }}
            onClick={() => openPortal(email)}
            disabled={!canBuy}
          >
            サブスク管理（解約・支払い方法変更）
          </button>

          <div style={styles.backLink}>
            <a href="/" style={styles.link}>
              ← 占い画面に戻る
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    background:
      "radial-gradient(1000px 600px at 10% 0%, #1b1b3a 0%, transparent 60%)," +
      "radial-gradient(900px 500px at 90% 0%, #2b144a 0%, transparent 55%)," +
      "linear-gradient(180deg, #0b0b14, #0f1022 45%, #0b0b14)",
    color: "#f7f7ff",
    padding: "32px 16px 48px",
  },
  container: { maxWidth: 820, margin: "0 auto" },
  header: { marginBottom: 16 },
  title: { fontSize: 28, margin: 0 },
  sub: { opacity: 0.8, marginTop: 6 },

  messageSection: { marginTop: 12, marginBottom: 4 },
  successMessage: {
    padding: 10,
    borderRadius: 10,
    background: "rgba(34,197,94,0.18)",
    border: "1px solid rgba(34,197,94,0.4)",
    fontSize: 13,
  },
  cancelMessage: {
    padding: 10,
    borderRadius: 10,
    background: "rgba(248,113,113,0.18)",
    border: "1px solid rgba(248,113,113,0.4)",
    fontSize: 13,
  },

  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
  },
  label: { fontSize: 12, opacity: 0.8 },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 16,
    marginTop: 6,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.3)",
    color: "white",
    outline: "none",
  },
  note: { marginTop: 10, fontSize: 13, opacity: 0.85 },

  statusBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
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

  grid: {
    display: "grid",
    gap: 16,
    marginTop: 20,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  planCard: {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 180,
  },
  planHeader: { marginBottom: 8 },
  planName: { fontSize: 15, opacity: 0.9 },
  planPrice: { fontSize: 18, fontWeight: 600 },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "8px 0 16px",
    fontSize: 13,
    opacity: 0.9,
  },
  button: {
    marginTop: "auto",
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.25)",
    background:
      "linear-gradient(90deg, rgba(150,120,255,0.7), rgba(120,200,255,0.65))",
    color: "white",
    fontSize: 14,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.3)",
    background: "transparent",
    color: "white",
    fontSize: 13,
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  footerSection: { marginTop: 24, textAlign: "center" as const },
  backLink: { marginTop: 10 },
  link: { color: "#d0e4ff", textDecoration: "underline" },
};
