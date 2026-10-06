"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
/** Checks local inference support without accessing a camera or uploading a frame. */
export function PoseCompatibility() {
  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "error">(
    "idle",
  );
  const [diagnostic, setDiagnostic] = useState("");
  const worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      worker.current?.terminate();
      clearTimeout(timer.current);
    },
    [],
  );
  function check() {
    worker.current?.terminate();
    clearTimeout(timer.current);
    setStatus("checking");
    setDiagnostic("");
    const end = (next: "ready" | "error") => {
      clearTimeout(timer.current);
      worker.current?.terminate();
      worker.current = null;
      setStatus(next);
    };
    try {
      const w = new Worker("/pose-worker.js");
      worker.current = w;
      timer.current = setTimeout(() => end("error"), 30000);
      w.onerror = (event) => {
        setDiagnostic(event.message || "The pose worker could not start.");
        end("error");
      };
      w.onmessage = (e) => {
        if (e.data.type === "ready") w.postMessage({ type: "check" });
        else if (e.data.type === "checked") end("ready");
        else if (e.data.type === "error") {
          setDiagnostic(String(e.data.message).slice(0, 500));
          end("error");
        }
      };
      w.postMessage({ type: "init" });
    } catch {
      end("error");
    }
  }
  return (
    <div className="pose-compatibility">
      <Button
        variant="outline"
        onClick={check}
        disabled={status === "checking"}
      >
        {status === "checking"
          ? "Checking your browser…"
          : "Check browser compatibility"}
      </Button>
      <p className="quiet-note" role="status">
        {status === "ready"
          ? "Local pose inference is ready in this browser. Camera permission is still required to train."
          : status === "error"
            ? "This browser could not run the local pose engine. Try an up-to-date Chrome or Edge browser, or use motion replay."
            : "Test local pose inference without turning on your camera."}
      </p>
      {status === "error" && diagnostic && (
        <details className="quiet-note">
          <summary>Browser diagnostic</summary>
          <p>{diagnostic}</p>
        </details>
      )}
    </div>
  );
}
