"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { mutate } from "swr";
import {
  addSavedPrompt,
  deletePrompt,
  emptyLibrary,
  normalizeLibrary,
  randomPrompt,
  restorePrompt,
  toggleFavorite,
  type PromptDeletion,
  type PromptLibrary,
} from "@/lib/prompts";
import type { Editor } from "@tiptap/core";

const KEY = "/api/auth/prompts";

export type PromptLibraryApi = {
  getLibrary: () => PromptLibrary;
  random: (excluding?: string) => string;
  toggleFavorite: (id: string) => void;
  deletePrompt: (id: string) => void;
  addSaved: (text: string, favorite: boolean) => void;
  subscribe: (listener: () => void) => () => void;
};

const apis = new WeakMap<Editor, PromptLibraryApi>();

export function getPromptLibraryApi(editor: Editor) {
  return apis.get(editor);
}

export function bindPromptLibrary(editor: Editor, api: PromptLibraryApi) {
  apis.set(editor, api);
}

export function usePromptLibrary() {
  const { data } = useApi<PromptLibrary>(KEY);
  const library = useMemo(
    () => normalizeLibrary(data ?? emptyLibrary()),
    [data]
  );
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const listeners = useRef(new Set<() => void>());
  const [deletion, setDeletion] = useState<PromptDeletion | null>(null);

  useEffect(() => {
    if (!deletion) return;
    const timeout = window.setTimeout(() => setDeletion(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [deletion]);

  const commit = useCallback((next: PromptLibrary) => {
    const normalized = normalizeLibrary(next);
    libraryRef.current = normalized;
    void mutate(KEY, normalized, false);
    listeners.current.forEach((listener) => listener());
    void fetch(KEY, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    }).then((response) => {
      if (!response.ok) void mutate(KEY);
    });
  }, []);

  const api = useMemo<PromptLibraryApi>(
    () => ({
      getLibrary: () => libraryRef.current,
      random: (excluding) => randomPrompt(libraryRef.current, { excluding }),
      toggleFavorite: (id) => commit(toggleFavorite(libraryRef.current, id)),
      deletePrompt: (id) => {
        const result = deletePrompt(libraryRef.current, id);
        if (!result.deletion) return;
        commit(result.library);
        setDeletion(result.deletion);
      },
      addSaved: (text, favorite) => {
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `saved-${Date.now()}`;
        commit(addSavedPrompt(libraryRef.current, text, { id, favorite }));
      },
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [commit]
  );

  const undo = useCallback(() => {
    if (!deletion) return;
    commit(restorePrompt(libraryRef.current, deletion));
    setDeletion(null);
  }, [commit, deletion]);

  const bindEditor = useCallback(
    (editor: Editor | null) => {
      if (!editor) return;
      bindPromptLibrary(editor, api);
    },
    [api]
  );

  return { library, api, deletion, undo, bindEditor };
}
