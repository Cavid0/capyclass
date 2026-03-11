"use client";

import { useRef } from "react";
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react";
import { toast } from "sonner";

interface CodeEditorProps {
    value: string;
    onChange?: (value: string | undefined) => void;
    language?: string;
    readOnly?: boolean;
}

const BG = "#0a0908"; // Matches --bg-primary

export function CodeEditor({ value, onChange, language = "javascript", readOnly = false }: CodeEditorProps) {
    const editorRef = useRef<any>(null);

    const handleBeforeMount: BeforeMount = (monaco) => {
        monaco.editor.defineTheme("capy-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
                { token: "keyword.control", foreground: "c586c0" },
                { token: "type", foreground: "4ec9b0" },
                { token: "type.identifier", foreground: "4ec9b0" },
                { token: "string", foreground: "ce9178" },
                { token: "string.escape", foreground: "d7ba7d" },
                { token: "number", foreground: "b5cea8" },
                { token: "comment", foreground: "6a9955" },
                { token: "delimiter", foreground: "d4d4d4" },
                { token: "variable", foreground: "9cdcfe" },
                { token: "identifier", foreground: "9cdcfe" },
                { token: "function", foreground: "dcdcaa" },
                { token: "regexp", foreground: "d16969" },
            ],
            colors: {
                "editor.background": BG,
                "editor.foreground": "#d4d4d4",
                "editorLineNumber.foreground": "#858585",
                "editorLineNumber.activeForeground": "#ffffff",
                "editor.lineHighlightBackground": "#ffffff0a",
                "editor.lineHighlightBorder": "#00000000",
                "editorGutter.background": BG,
                "editorIndentGuide.background": "#404040",
                "editorIndentGuide.activeBackground": "#707070",
                "editor.selectionBackground": "#264f78",
                "editor.selectionHighlightBackground": "#add6ff26",
                "editorCursor.foreground": "#d4d4d4",
                "editor.wordHighlightBackground": "#575757b8",
                "editor.wordHighlightStrongBackground": "#004972b8",
                "editorBracketMatch.background": "#00000000",
                "editorBracketMatch.border": "#888888",
            },
        });
    };

    const handleMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        monaco.editor.setTheme("capy-dark");

        if (readOnly) {
            editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
            editor.setPosition({ lineNumber: 1, column: 1 });

            // Inform admins that this editor is view-only when they click into it.
            editor.onMouseDown((e) => {
                // Do not show the warning when clicking the scrollbar.
                if (e.target.type !== monaco.editor.MouseTargetType.SCROLLBAR) {
                    toast("🖥️ View only", {
                        id: "readonly-toast",
                        description: "You can monitor this code panel, but you cannot edit the student's code.",
                        duration: 2500,
                    });
                }
            });
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
            className={readOnly ? "read-only-editor" : ""}
            style={{ width: "100%", height: "100%", position: "relative", background: BG }}
        >
            <Editor
                key={`${language}-${readOnly}`}
                height="100%"
                language={language}
                theme="capy-dark"
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
                    lineHeight: 26,
                    padding: { top: 12, bottom: 12 },
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
                    fontLigatures: true,
                    cursorBlinking: "smooth",
                    cursorWidth: readOnly ? 0 : 2, // Fully hide the cursor in read-only mode.
                    smoothScrolling: true,
                    folding: true,
                    lineNumbers: "on",
                    lineNumbersMinChars: 4,
                    glyphMargin: false,
                    foldingHighlight: false,
                    showFoldingControls: "never",
                    scrollBeyondLastLine: false,
                    renderLineHighlight: readOnly ? "none" : "all", // Hide the active line highlight in read-only mode.
                    renderLineHighlightOnlyWhenFocus: false,
                    readOnlyMessage: { value: "View only 🔒" },
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    lineDecorationsWidth: 12,
                    renderValidationDecorations: "off",
                    renderWhitespace: "none",
                    bracketPairColorization: { enabled: true },
                    guides: {
                        indentation: true,
                        bracketPairs: true,
                    },
                    find: {
                        addExtraSpaceOnTop: false,
                    },
                    scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                        verticalSliderSize: 4,
                        horizontalSliderSize: 4,
                    },
                }}
                loading={
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b4a48", fontSize: "14px" }}>
                        Loading editor...
                    </div>
                }
            />
        </div>
    );
}
