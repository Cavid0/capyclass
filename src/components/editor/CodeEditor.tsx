"use client";

import { useRef } from "react";
import Editor, { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

interface CodeEditorProps {
    value: string;
    onChange?: (value: string | undefined) => void;
    language?: string;
    readOnly?: boolean;
}

const BG = "#0a0908"; // Matches --bg-primary
const HEADER_BG = "#12100e";
const BORDER = "rgba(232, 168, 73, 0.14)";


let monacoEnvironmentConfigured = false;

function createWorker(workerPath: string) {
    return new Worker(new URL(workerPath, import.meta.url), { type: "module" });
}

function ensureMonacoEnvironment() {
    if (monacoEnvironmentConfigured || typeof self === "undefined") {
        return;
    }

    (self as typeof self & {
        MonacoEnvironment?: {
            getWorker: (_moduleId: string, label: string) => Worker;
        };
    }).MonacoEnvironment = {
        getWorker(_moduleId: string, label: string) {
            if (label === "json") {
                return createWorker("monaco-editor/esm/vs/language/json/json.worker.js");
            }

            if (label === "css" || label === "scss" || label === "less") {
                return createWorker("monaco-editor/esm/vs/language/css/css.worker.js");
            }

            if (label === "html" || label === "handlebars" || label === "razor") {
                return createWorker("monaco-editor/esm/vs/language/html/html.worker.js");
            }

            if (label === "typescript" || label === "javascript") {
                return createWorker("monaco-editor/esm/vs/language/typescript/ts.worker.js");
            }

            return createWorker("monaco-editor/esm/vs/editor/editor.worker.js");
        },
    };

    monacoEnvironmentConfigured = true;
}

ensureMonacoEnvironment();
loader.config({ monaco });

export function CodeEditor({ value, onChange, language = "javascript", readOnly = false }: CodeEditorProps) {
    const editorRef = useRef<any>(null);
    const lineCount = Math.max(value.split("\n").length, 1);

    const handleBeforeMount: BeforeMount = (monaco) => {
        monaco.editor.defineTheme("classflow-theme", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "comment", foreground: "6A9955", fontStyle: "italic" },
                { token: "keyword", foreground: "C586C0" },
                { token: "keyword.control", foreground: "C586C0" },
                { token: "keyword.operator", foreground: "D4D4D4" },
                { token: "string", foreground: "CE9178" },
                { token: "string.escape", foreground: "D7BA7D" },
                { token: "number", foreground: "B5CEA8" },
                { token: "regexp", foreground: "D16969" },
                { token: "type", foreground: "4EC9B0" },
                { token: "type.identifier", foreground: "4EC9B0" },
                { token: "class", foreground: "4EC9B0" },
                { token: "interface", foreground: "B8D7A3" },
                { token: "enum", foreground: "B8D7A3" },
                { token: "function", foreground: "DCDCAA" },
                { token: "function.call", foreground: "DCDCAA" },
                { token: "method", foreground: "DCDCAA" },
                { token: "identifier", foreground: "9CDCFE" },
                { token: "variable", foreground: "9CDCFE" },
                { token: "variable.predefined", foreground: "4FC1FF" },
                { token: "variable.parameter", foreground: "9CDCFE" },
                { token: "property", foreground: "9CDCFE" },
                { token: "operator", foreground: "D4D4D4" },
                { token: "delimiter", foreground: "D4D4D4" },
                { token: "tag", foreground: "569CD6" },
                { token: "attribute.name", foreground: "9CDCFE" },
                { token: "attribute.value", foreground: "CE9178" },
            ],
            colors: {
                "editor.background": BG,
                "editor.foreground": "#D4D4D4",
                "editorCursor.foreground": "#AEAFAD",
                "editorLineNumber.foreground": "#4b4a48",
                "editorLineNumber.activeForeground": "#C6C6C6",
                "editor.lineHighlightBackground": "#2A2D2E",
                "editorGutter.background": BG,
                "editorIndentGuide.background1": "#404040",
                "editorIndentGuide.activeBackground1": "#707070",
                "editorWhitespace.foreground": "#404040",
                "editor.selectionBackground": "#264F78",
                "editor.inactiveSelectionBackground": "#3A3D41",
                "editor.selectionHighlightBackground": "#ADD6FF26",
                "editor.wordHighlightBackground": "#575757B8",
                "editor.wordHighlightStrongBackground": "#004972B8",
                "editorBracketMatch.background": "#0064001A",
                "editorBracketMatch.border": "#888888",
                "editorOverviewRuler.border": "#00000000",
            },
        });
    };

    const handleMount: OnMount = (editor) => {
        editorRef.current = editor;

        if (readOnly) {
            editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
            editor.setPosition({ lineNumber: 1, column: 1 });
        } else {
            const model = editor.getModel();
            if (model) {
                const lastLine = model.getLineCount();
                const lastCol = model.getLineMaxColumn(lastLine);
                editor.setPosition({ lineNumber: lastLine, column: lastCol });
                editor.focus();
            }
        }
    };

    return (
        <div
            className="editor-container"
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                background: BG,
                border: `1px solid ${BORDER}`,
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.24)",
            }}
        >
            <div
                style={{
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 14px",
                    borderBottom: `1px solid ${BORDER}`,
                    background: HEADER_BG,
                    color: "#a8a08e",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                }}
            >
                <span>{language}</span>
                <span>{lineCount} lines</span>
            </div>
            <div style={{ height: "calc(100% - 38px)", background: BG }}>
                <Editor
                    key={`${language}-${readOnly}`}
                    height="100%"
                    language={language}
                    theme="classflow-theme"
                    value={value ?? ""}
                    onChange={onChange}
                    beforeMount={handleBeforeMount}
                    onMount={handleMount}
                    options={{
                        readOnly,
                        domReadOnly: readOnly,
                        automaticLayout: true,
                        minimap: { enabled: false },
                        wordWrap: "on",
                        fontSize: 15,
                        lineHeight: 24,
                        padding: { top: 14, bottom: 14 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        cursorWidth: 2,
                        smoothScrolling: true,
                        folding: true,
                        lineNumbers: "on",
                        lineNumbersMinChars: 4,
                        glyphMargin: false,
                        foldingHighlight: false,
                        showFoldingControls: "mouseover",
                        scrollBeyondLastLine: false,
                        renderLineHighlight: "all",
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                        lineDecorationsWidth: 12,
                        overviewRulerLanes: 0,
                        fixedOverflowWidgets: true,
                        renderValidationDecorations: "off",
                        bracketPairColorization: {
                            enabled: true,
                        },
                        guides: {
                            indentation: true,
                            bracketPairs: true,
                        },
                        find: {
                            addExtraSpaceOnTop: false,
                        },
                        scrollbar: {
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10,
                        },
                    }}
                    loading={
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b4a48", fontSize: "14px" }}>
                            Loading editor...
                        </div>
                    }
                />
            </div>
        </div>
    );
}
