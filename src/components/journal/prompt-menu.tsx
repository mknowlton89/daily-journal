"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Check, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  composerState,
  type ListedPrompt,
  type PickerRow,
  type PromptDeletion,
} from "@/lib/prompts";

export function PromptMenu({
  label,
  rows,
  favorites,
  rest,
  index,
  currentText,
  showSurprise,
  composing,
  draft,
  saveForLater,
  favorite,
  onHover,
  onActivate,
  onToggleFavorite,
  onDelete,
  onDraftChange,
  onSaveForLater,
  onFavoriteChange,
  onCancelCompose,
  onSubmitCompose,
}: {
  label: string;
  rows: PickerRow[];
  favorites: ListedPrompt[];
  rest: ListedPrompt[];
  index: number;
  currentText?: string;
  showSurprise: boolean;
  composing: boolean;
  draft: string;
  saveForLater: boolean;
  favorite: boolean;
  onHover: (index: number) => void;
  onActivate: (index: number) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onDraftChange: (value: string) => void;
  onSaveForLater: (value: boolean) => void;
  onFavoriteChange: (value: boolean) => void;
  onCancelCompose: () => void;
  onSubmitCompose: () => void;
}) {
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const form = composerState({ text: draft, saveForLater, favorite });

  useEffect(() => {
    if (composing) draftRef.current?.focus();
  }, [composing]);

  return (
    <div
      role={composing ? "dialog" : "listbox"}
      aria-label={label}
      className="w-80 rounded-lg border border-black/10 bg-[#f7f4ee] p-1.5 text-[#1c1916] shadow-lg dark:border-white/10 dark:bg-[#2a2a28] dark:text-[#f3efe6]"
    >
      {composing ? (
        <PromptComposer
          draftRef={draftRef}
          draft={draft}
          form={form}
          onDraftChange={onDraftChange}
          onSaveForLater={onSaveForLater}
          onFavoriteChange={onFavoriteChange}
          onCancel={onCancelCompose}
          onSubmit={onSubmitCompose}
        />
      ) : (
        <>
          {showSurprise && (
            <PickerButton
              selected={index === 0}
              onMouseEnter={() => onHover(0)}
              onClick={() => onActivate(0)}
            >
              <Sparkles className="size-4 text-[#9a7340] dark:text-[#d4b483]" aria-hidden="true" />
              Surprise me
            </PickerButton>
          )}
          <div className="my-1 border-t border-black/10 dark:border-white/10" />
          <div className="max-h-64 overflow-y-auto">
            <PromptSection
              title="Favorites"
              icon
              prompts={favorites}
              rows={rows}
              index={index}
              currentText={currentText}
              onHover={onHover}
              onActivate={onActivate}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDelete}
            />
            <PromptSection
              title="All prompts"
              prompts={rest}
              rows={rows}
              index={index}
              currentText={currentText}
              onHover={onHover}
              onActivate={onActivate}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDelete}
            />
            {favorites.length === 0 && rest.length === 0 && (
              <p className="px-2 py-2 text-sm text-[#8a847a]">No matches</p>
            )}
          </div>
          <div className="my-1 border-t border-black/10 dark:border-white/10" />
          <PickerButton
            selected={index === addIndex(rows)}
            onMouseEnter={() => onHover(addIndex(rows))}
            onClick={() => onActivate(addIndex(rows))}
            className="text-[#9a7340] dark:text-[#d4b483]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add your own prompt
          </PickerButton>
          {removeIndex(rows) >= 0 && (
            <>
              <div className="my-1 border-t border-black/10 dark:border-white/10" />
              <PickerButton
                selected={index === removeIndex(rows)}
                onMouseEnter={() => onHover(removeIndex(rows))}
                onClick={() => onActivate(removeIndex(rows))}
                className="text-[#a86862] dark:text-[#d08b84]"
              >
                <X className="size-4" aria-hidden="true" />
                Remove from entry
              </PickerButton>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PromptSection({
  title,
  icon,
  prompts,
  rows,
  index,
  currentText,
  onHover,
  onActivate,
  onToggleFavorite,
  onDelete,
}: {
  title: string;
  icon?: boolean;
  prompts: ListedPrompt[];
  rows: PickerRow[];
  index: number;
  currentText?: string;
  onHover: (index: number) => void;
  onActivate: (index: number) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!prompts.length) return null;
  return (
    <div className="py-1">
      <p className="flex items-center gap-1 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a847a]">
        {icon && <Star className="size-3" aria-hidden="true" />}
        {title}
      </p>
      {prompts.map((prompt) => {
        const rowIndex = rows.findIndex(
          (row) => row.kind === "prompt" && row.prompt.id === prompt.id
        );
        const selected = rowIndex === index;
        return (
          <div
            key={prompt.id}
            role="option"
            aria-selected={selected}
            onMouseEnter={() => onHover(rowIndex)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onActivate(rowIndex)}
            className={cn(
              "group flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2",
              selected && "bg-black/5 dark:bg-white/10"
            )}
          >
            {currentText === prompt.text && (
              <Check className="size-4 shrink-0 text-[#9a7340]" aria-label="Current prompt" />
            )}
            <span className="min-w-0 flex-1 truncate text-left text-sm">{prompt.text}</span>
            {prompt.source === "saved" && (
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-[#8a847a]">
                Yours
              </span>
            )}
            <span
              className={cn(
                "shrink-0 items-center",
                selected ? "flex" : "hidden [@media(hover:none)]:flex"
              )}
            >
              <IconButton
                label={prompt.favorite ? "Remove from favorites" : "Add to favorites"}
                onClick={() => onToggleFavorite(prompt.id)}
              >
                <Star
                  className={cn(
                    "size-4",
                    prompt.favorite && "fill-[#c4a46a] text-[#c4a46a]"
                  )}
                />
              </IconButton>
              <IconButton label="Delete prompt" onClick={() => onDelete(prompt.id)}>
                <Trash2 className="size-4" />
              </IconButton>
            </span>
            {!selected && prompt.favorite && (
              <Star
                className="size-4 shrink-0 fill-[#c4a46a] text-[#c4a46a] [@media(hover:none)]:hidden"
                aria-label="Favorite"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PromptComposer({
  draftRef,
  draft,
  form,
  onDraftChange,
  onSaveForLater,
  onFavoriteChange,
  onCancel,
  onSubmit,
}: {
  draftRef: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  form: ReturnType<typeof composerState>;
  onDraftChange: (value: string) => void;
  onSaveForLater: (value: boolean) => void;
  onFavoriteChange: (value: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="p-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.canInsert) onSubmit();
      }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a7340] dark:text-[#d4b483]">
        New prompt
      </p>
      <textarea
        ref={draftRef}
        aria-label="New prompt"
        value={draft}
        rows={2}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (form.canInsert) onSubmit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        className="mt-2 w-full resize-none rounded-md border border-[#c4a46a] bg-transparent px-3 py-2 font-journal text-[1.05rem] outline-none"
      />
      <SwitchRow
        label="Save for later"
        help={form.saveHelp}
        checked={form.saveForLater}
        onChange={onSaveForLater}
      />
      <SwitchRow
        label="Add to favorites"
        help={form.favoriteHelp}
        checked={form.favorite}
        enabled={form.favoriteEnabled}
        icon
        onChange={onFavoriteChange}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 cursor-pointer items-center px-3 text-sm text-[#8a847a]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!form.canInsert}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-[#c4a46a] px-4 text-sm font-medium text-[#1c1916] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {form.primaryLabel}
        </button>
      </div>
    </form>
  );
}

function SwitchRow({
  label,
  help,
  checked,
  enabled = true,
  icon,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  enabled?: boolean;
  icon?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={cn("mt-3 flex items-center gap-3", !enabled && "opacity-45")}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm">
          {icon && <Star className="size-3.5" aria-hidden="true" />}
          {label}
        </p>
        <p className="text-xs text-[#8a847a]">{help}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={!enabled}
        aria-label={label}
        onClick={() => {
          if (enabled) onChange(!checked);
        }}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full",
          checked && enabled ? "bg-[#c4a46a]" : "bg-black/10 dark:bg-white/15",
          !enabled && "cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-white transition",
            checked && enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function addIndex(rows: PickerRow[]) {
  const index = rows.findIndex((row) => row.kind === "add");
  return index >= 0 ? index : 0;
}

function removeIndex(rows: PickerRow[]) {
  return rows.findIndex((row) => row.kind === "remove");
}

function PickerButton({
  selected,
  className,
  onMouseEnter,
  onClick,
  children,
}: {
  selected: boolean;
  className?: string;
  onMouseEnter: () => void;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm",
        selected && "bg-black/5 dark:bg-white/10",
        className
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-[#8a847a] hover:text-[#1c1916] dark:hover:text-[#f3efe6]"
    >
      {children}
    </button>
  );
}

export function PromptDeletedToast({
  message = "Prompt deleted",
  onUndo,
  className,
}: {
  message?: string;
  onUndo: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-black/10 bg-[#2a2a28] px-4 py-2 text-sm text-[#f3efe6] shadow-lg",
        className
      )}
    >
      {message}
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex min-h-11 cursor-pointer items-center font-medium text-[#d4b483]"
      >
        Undo
      </button>
    </div>
  );
}
