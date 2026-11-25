import { Extension } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";

export const exitCodeBlock = Extension.create({
  name: "exitCodeBlock",
  priority: 200,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        return editor.commands.command(({ state, tr }) => {
          const { $from, empty } = state.selection;
          if (!empty || $from.parent.type.name !== "codeBlock") return false;

          const atEnd = $from.parentOffset === $from.parent.nodeSize - 2;
          const onBlankLine = $from.parent.textContent.endsWith("\n");
          if (!atEnd || !onBlankLine) return false;

          const after = $from.after();
          tr.delete($from.pos - 1, $from.pos);
          const mappedAfter = tr.mapping.map(after);
          if (!tr.doc.nodeAt(mappedAfter)) {
            tr.insert(mappedAfter, state.schema.nodes.paragraph.create());
          }
          tr.setSelection(Selection.near(tr.doc.resolve(mappedAfter), 1));
          return true;
        });
      },
    };
  },
});
