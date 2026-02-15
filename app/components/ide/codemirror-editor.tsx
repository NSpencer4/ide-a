"use client";

import {useRef, useEffect} from "react";
import {EditorView, basicSetup} from "codemirror";
import {EditorState} from "@codemirror/state";
import {javascript} from "@codemirror/lang-javascript";
import {css} from "@codemirror/lang-css";
import {html} from "@codemirror/lang-html";
import {json} from "@codemirror/lang-json";
import {oneDark} from "@codemirror/theme-one-dark";

function getLanguageExtension(language: string) {
    switch (language) {
        case "tsx":
        case "jsx":
            return javascript({jsx: true, typescript: language === "tsx"});
        case "ts":
            return javascript({typescript: true});
        case "js":
            return javascript();
        case "css":
            return css();
        case "html":
            return html();
        case "json":
            return json();
        default:
            return [];
    }
}

interface CodeMirrorEditorProps {
    value: string;
    onChange: (value: string) => void;
    language: string;
}

export function CodeMirrorEditor({value, onChange, language}: CodeMirrorEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        if (!containerRef.current) return;

        const state = EditorState.create({
            doc: value,
            extensions: [
                basicSetup,
                oneDark,
                getLanguageExtension(language),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                }),
                EditorView.theme({
                    "&": {height: "100%", fontSize: "13px"},
                    ".cm-scroller": {overflow: "auto"},
                }),
            ],
        });

        const view = new EditorView({
            state,
            parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [language]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const current = view.state.doc.toString();
        if (current !== value) {
            view.dispatch({
                changes: {from: 0, to: current.length, insert: value},
            });
        }
    }, [value]);

    return <div ref={containerRef} className="h-full w-full overflow-hidden"/>;
}
