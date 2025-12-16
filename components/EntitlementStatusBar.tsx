"use client";

import { useEffect, useState } from "react";

type Props = {
  email: string | null;
};

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | {
      state: "loaded";
      planLabel: string;
      credits: number;
      isPremium: boolean;
      hasCredits: boolean;
    }
  | { state: "error"; message: string };

export function EntitlementStatusBar({ email }: Props) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  useEffect(() => {
    if (!email) {
      setStatus({ state: "idle" });
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      setStatus({ state: "loading" });
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

        setStatus({
          state: "loaded",
          planLabel: data.planLabel as string,
          credits: data.credits as number,
          isPremium: data.isPremium as boolean,
          hasCredits: data.hasCredits as boolean,
        });
      } catch (e) {
        console.error("failed to load entitlement status", e);
        if (!cancelled) {
          setStatus({
            state: "error",
            message: "ご利用状況の取得に失敗しました。",
          });
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [email]);

  // メール未入力のときは、バー自体を出さない or 案内だけ出す
  if (!email) {
    return (
      <div className="mt-4 text-sm text-slate-200/80">
        メールアドレスをご入力いただくと、現在のご利用状況が表示されます。
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-slate-50 backdrop-blur">
      <div className="font-semibold mb-1">現在のご利用状況</div>

      {status.state === "loading" && (
        <div className="text-slate-200/80">読み込み中です…</div>
      )}

      {status.state === "error" && (
        <div className="text-red-300">{status.message}</div>
      )}

      {status.state === "loaded" && (
        <div className="space-y-1">
          <div>
            <span className="text-slate-300">ご契約プラン：</span>
            <span className="font-medium">{status.planLabel}</span>
          </div>
          <div>
            <span className="text-slate-300">お持ちのチケット：</span>
            <span className="font-medium">{status.credits} 枚</span>
          </div>
          {status.isPremium ? (
            <div className="text-emerald-300 text-xs">
              プレミアムプランのため、深掘りは回数無制限でご利用いただけます。
            </div>
          ) : status.hasCredits ? (
            <div className="text-emerald-300 text-xs">
              チケットをご利用いただくと、深掘りメッセージをお届けします。
            </div>
          ) : (
            <div className="text-amber-200 text-xs">
              深掘りをご希望の場合は、チケットのご購入または月額プランをご検討ください。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
