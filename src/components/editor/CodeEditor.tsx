"use client";

import { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

interface CodeEditorProps {
    value: string;
    onChange?: (value: string | undefined) => void;
    language?: string;
    readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language = "javascript", readOnly = false }: CodeEditorProps) {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Define ultra-clean dark theme
        monaco.editor.defineTheme('classflow-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { background: '0e0e0e' },
                { token: 'comment', foreground: '52525b', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'a78bfa' },
                { token: 'string', foreground: '34d399' },
                { token: 'number', foreground: 'f472b6' },
            ],
            colors: {
                'editor.background': '#000000', // matches bg-primary
                'editor.foreground': '#ededed',
                'editor.lineHighlightBackground': '#111111',
                'editorLineNumber.foreground': '#3f3f46',
                'editorIndentGuide.background': '#27272a',
                'editor.selectionBackground': '#27272a',
                'scrollbarSlider.background': '#27272a',
                'scrollbarSlider.hoverBackground': '#3f3f46',
            }
        });

        monaco.editor.setTheme('classflow-dark');
    };

    return (
        <Editor
            height="100%"
            language={language}
            value={value}
            onChange={onChange}
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
                renderLineHighlight: "all",
            }}
            loading={
                <div className="flex justify-center items-center h-full w-full bg-black">
                    <div className="spinner !w-6 !h-6 border-white/20 border-t-white" />
                </div>
            }
        />
    );
}
