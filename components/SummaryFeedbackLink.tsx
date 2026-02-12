"use client";

import { useEffect, useRef, useState } from "react";

export function SummaryFeedbackLink({ storySlug, url }: { storySlug: string; url: string }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => {
      setStatus("idle");
      setError(null);
      setMessage("");
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  async function submit() {
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "summary",
          message,
          email: email.trim() || undefined,
          storySlug,
          url,
        }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed");
      setStatus("sent");
      window.setTimeout(() => dialogRef.current?.close(), 900);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="feedback-row">
      <button
        type="button"
        className="feedback-link"
        onClick={() => {
          dialogRef.current?.showModal();
        }}
      >
        Does this summary seem wrong?
      </button>

      <dialog ref={dialogRef} className="feedback-dialog">
        <form
          method="dialog"
          className="feedback-dialog-inner"
          onSubmit={(e) => {
            e.preventDefault();
            if (status === "submitting") return;
            void submit();
          }}
        >
          <div className="feedback-dialog-head">
            <div>
              <div className="feedback-dialog-title">Summary feedback</div>
              <div className="story-meta">Help us catch mistakes and improve extraction.</div>
            </div>
            <button className="btn" value="cancel">
              Close
            </button>
          </div>

          <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
            What looks wrong?
            <textarea
              className="input-control"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Example: The summary says X, but the articles say Y. Key context missing: ..."
            />
          </label>

          <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
            Email (optional)
            <input
              className="input-control"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          {error ? (
            <p className="note" style={{ margin: 0 }}>
              {error}
            </p>
          ) : null}

          <div className="chip-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="story-meta">
              {status === "sent" ? "Thanks, sent." : status === "submitting" ? "Sending..." : ""}
            </span>
            <button className="btn" type="submit" disabled={status === "submitting" || message.trim().length < 3}>
              Send feedback
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

