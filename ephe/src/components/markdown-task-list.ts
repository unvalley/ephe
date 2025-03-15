import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

// Custom extension to handle markdown task lists
export const MarkdownTaskList = Extension.create({
    name: 'markdownTaskList',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    handleKeyDown: (view, event) => {
                        // Convert [] to - [ ] when space is pressed after []
                        if (event.key === ' ') {
                            const { state, dispatch } = view;
                            const { selection } = state;
                            const { $from } = selection;
                            const textBefore = $from.nodeBefore?.text;

                            if (textBefore?.endsWith('[]')) {
                                const pos = $from.pos;
                                const start = pos - 2;

                                // Replace [] with - [ ]
                                dispatch(state.tr.insertText('- [ ] ', start - 1, pos));
                                return true;
                            }
                        }
                        return false;
                    },

                    handleClick: (view, pos, event) => {
                        const { state, dispatch } = view;
                        const { doc } = state;
                        const { target } = event;

                        // Check if we clicked on a task checkbox
                        if (target instanceof Element &&
                            (target.classList.contains('task-checkbox') ||
                                target.closest('.task-checkbox'))) {

                            // Find the node at the clicked position
                            const $pos = doc.resolve(pos);
                            const node = $pos.node();
                            const textContent = node.textContent;

                            if (textContent && /- \[([ x])\]/.test(textContent)) {
                                // Get the parent paragraph start position
                                const parentStart = $pos.start();

                                // Find the checkbox position
                                const checkboxIndex = textContent.indexOf('- [');
                                if (checkboxIndex >= 0) {
                                    const start = parentStart + checkboxIndex + 3; // After "- ["
                                    const end = start + 1; // Just the space or 'x'

                                    // Toggle the checkbox
                                    const isChecked = textContent.includes('- [x]');
                                    const newText = isChecked ? ' ' : 'x';

                                    // Update the document
                                    dispatch(state.tr.insertText(newText, start, end));
                                    return true;
                                }
                            }
                        }

                        return false;
                    },

                    // Transform paragraphs with task items to have special markup
                    transformPastedHTML(html) {
                        return html.replace(
                            /(<p[^>]*>)(- \[[ x]\])(.*?)(<\/p>)/g,
                            (match, p1, checkbox, content, p2) => {
                                return `${p1}<span class="task-checkbox">${checkbox}</span>${content}${p2}`;
                            }
                        );
                    },

                    // TODO: Add decorations to highlight task items
                    decorations(state) {
                        return null;
                    }
                }
            })
        ];
    }
});