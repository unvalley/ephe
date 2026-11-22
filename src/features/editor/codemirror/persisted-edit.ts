import { Transaction } from "@codemirror/state";

/**
 * Whether a transaction is an edit the user made, which the editor must save.
 *
 * Any change carrying a user event counts: typing and deleting, but also undo
 * and redo, moving tasks (`move.task.*`) and indenting (`indent.*`). Changes
 * the app makes itself (restoring a snapshot, syncing content from another
 * tab, formatting on save) carry no user event and are saved by their own code.
 */
export const isPersistedEdit = (tr: Transaction): boolean =>
  tr.docChanged && tr.annotation(Transaction.userEvent) !== undefined;
