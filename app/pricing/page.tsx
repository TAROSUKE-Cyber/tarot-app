import { Suspense } from "react";
import PricingClient from "./PricingClient";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#050513",
            color: "#fff",
          }}
        >
          料金ページを読み込み中です…
        </div>
      }
    >
      <PricingClient />
    </Suspense>
  );
}
