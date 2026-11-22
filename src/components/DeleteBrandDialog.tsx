"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ui-sdk/react/alert-dialog";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";

export function DeleteBrandDialog({
  brandName,
  description,
  confirmLabel,
  triggerLabel,
  triggerClassName,
  busyLabel = "Deleting...",
  onConfirm,
}: {
  brandName: string;
  description: string;
  confirmLabel: string;
  triggerLabel: string;
  triggerClassName?: string;
  busyLabel?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === brandName;

  const handleConfirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
      setTyped("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger
        className={triggerClassName ?? "btn-ghost"}
        aria-label={`Delete ${brandName}`}
      >
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogBackdrop style={{ background: "rgba(2,4,10,0.85)", backdropFilter: "blur(6px)" }} />
      <AlertDialogContent
        className="p-6"
        style={{
          position: "fixed",
          inset: 0,
          margin: "auto",
          height: "fit-content",
          maxHeight: "90vh",
          overflowY: "auto",
          maxWidth: "28rem",
          width: "calc(100vw - 2rem)",
          background: "#151a26",
          border: "1px solid var(--border-bright)",
          borderRadius: "1rem",
          boxShadow: "0 24px 80px -12px rgba(0,0,0,0.7)",
        }}
      >
        <AlertDialogTitle className="text-lg font-semibold" style={{ color: "#fff" }}>
          {confirmLabel}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {description}
        </AlertDialogDescription>
        <Field className="mt-5">
          <FieldLabel className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>
            Type <span style={{ color: "#fff" }}>{brandName}</span> to confirm
          </FieldLabel>
          <Input
            className="mt-2 w-full"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Type brand name"
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Must match exactly, including capitalization.</p>
        </Field>
        {error && (
          <p className="mt-2 text-sm" style={{ color: "#f87171" }} role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center justify-end gap-3">
          <AlertDialogClose className="btn-ghost">Cancel</AlertDialogClose>
          <button
            type="button"
            className="btn-primary cursor-pointer transition-colors duration-200"
            style={{
              background: matches ? "linear-gradient(120deg, #dc2626, #ef4444)" : undefined,
              opacity: matches ? 1 : 0.45,
            }}
            disabled={!matches || busy}
            onClick={handleConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
