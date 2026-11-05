import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NoctumApp } from "@/components/noctum/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <main className="phone flex min-h-dvh items-center justify-center">
        <p className="display text-lg">Noctum</p>
      </main>
    );
  }
  return <NoctumApp />;
}
