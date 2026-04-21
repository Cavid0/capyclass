"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[APP ERROR]", error);
    }, [error]);

    return (
        <div style={{
            minHeight: "100vh",
            padding: "2rem",
            background: "#0a0908",
            color: "#f0ece4",
            fontFamily: "monospace",
        }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                Runtime Error
            </h1>
            <pre style={{
                background: "#1a1612",
                padding: "1rem",
                borderRadius: "8px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "0.85rem",
                lineHeight: "1.5",
                border: "1px solid #3d362e",
            }}>
                {error.message}
                {error.stack ? "\n\n" + error.stack : ""}
                {error.digest ? "\n\ndigest: " + error.digest : ""}
            </pre>
            <button
                onClick={() => reset()}
                style={{
                    marginTop: "1rem",
                    padding: "0.5rem 1rem",
                    background: "#e8a849",
                    color: "#0a0908",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                }}
            >
                Try again
            </button>
        </div>
    );
}
