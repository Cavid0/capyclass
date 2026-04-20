"use client";

import dynamic from "next/dynamic";

export const CodeEditor = dynamic(
    () => import("./CodeEditor").then((mod) => ({ default: mod.CodeEditor })),
    {
        ssr: false,
        loading: () => (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0a0908",
                    border: "1px solid rgba(232, 168, 73, 0.14)",
                    color: "#4b4a48",
                    fontSize: 14,
                }}
            >
                Loading editor...
            </div>
        ),
    }
);
