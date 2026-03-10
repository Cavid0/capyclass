"use client";

import { useRef, useEffect } from "react";
import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";

interface CodeEditorProps {
    value: string;
    onChange?: (value: string | undefined) => void;
    language?: string;
    readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language = "javascript", readOnly = false }: CodeEditorProps) {
    const editorRef = useRef<any>(null);

    const handleEditorWillMount: BeforeMount = (monaco) => {
        monaco.editor.defineTheme('classflow-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { background: '0d1117' },
                { token: 'comment', foreground: '6e7681', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff7b72' },
                { token: 'string', foreground: 'a5d6ff' },
                { token: 'number', foreground: '79c0ff' },
                { token: 'type', foreground: 'ffa657' },
                { token: 'variable', foreground: 'ffa657' },
                { token: 'delimiter', foreground: 'c9d1d9' },
            ],
            colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#c9d1d9',
                'editor.lineHighlightBackground': '#161b22',
                'editorLineNumber.foreground': '#484f58',
                'editorLineNumber.activeForeground': '#c9d1d9',
                'editorIndentGuide.background': '#21262d',
                'editor.selectionBackground': '#264f78',
                'scrollbarSlider.background': '#484f5833',
                'scrollbarSlider.hoverBackground': '#484f5866',
                'editorCursor.foreground': '#58a6ff',
            }
        });
    };

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monaco.editor.setTheme('classflow-dark');

        // Hide the textarea overlay that can appear as a white box
        const domNode = editor.getDomNode();
        if (domNode) {
            const textareas = domNode.querySelectorAll('textarea');
            textareas.forEach((ta: HTMLTextAreaElement) => {
                ta.style.background = 'transparent';
                ta.style.color = 'transparent';
                ta.style.caretColor = 'transparent';
                ta.style.opacity = '0';
            });
        }

        if (readOnly) {
            // Hide cursor in read-only mode
            editor.updateOptions({ cursorStyle: 'line', cursorWidth: 0 });
        }

        setTimeout(() => {
            editor.layout();
        }, 100);
    };

    useEffect(() => {
        if (readOnly && editorRef.current && value !== undefined) {
            const model = editorRef.current.getModel();
            if (model && model.getValue() !== value) {
                model.setValue(value);
            }
        }
    }, [value, readOnly]);

    return (
        <Editor
            height="100%"
            language={language}
            theme="classflow-dark"
            value={value}
            defaultValue={value || "// No code"}
            onChange={onChange}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
            options={{
                readOnly,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
                fontLigatures: true,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                lineHeight: 22,
                renderLineHighlight: readOnly ? "none" : "all",
                domReadOnly: readOnly,
                automaticLayout: true,
                ...(readOnly ? {
                    cursorWidth: 0,
                    hideCursorInOverviewRuler: true,
                    find: { addExtraSpaceOnTop: false, seedSearchStringFromSelection: "never" as const },
                    contextmenu: false,
                    selectionHighlight: false,
                    occurrencesHighlight: "off" as const,
                } : {}),
            }}
            loading={
                <div className="flex justify-center items-center h-full w-full bg-[#0d1117]">
                    <div className="spinner !w-6 !h-6 border-white/20 border-t-white" />
                </div>
            }
        />
    );
}
