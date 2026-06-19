"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "./ui";

export function LogsViewer() {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/stream/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    }
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-medium">FFmpeg Logs</h3>
      <pre className="max-h-[70vh] overflow-auto rounded-lg bg-black/60 p-4 text-xs leading-relaxed text-slate-300">
        {logs.length === 0 ? "No logs yet." : logs.join("\n")}
        <div ref={bottomRef} />
      </pre>
    </Card>
  );
}
