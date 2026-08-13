import { useEffect } from "react";

export default function GraphModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "3rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          width: "100%",
          height: "100%",
          maxWidth: "1400px",
          padding: "2rem",
          position: "relative",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text)" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-bg)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              fontSize: "1.05rem",
              color: "var(--color-text-muted)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-bg)")}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}