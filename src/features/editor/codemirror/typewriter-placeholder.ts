import type { Extension } from "@codemirror/state";
import { placeholder, ViewPlugin } from "@codemirror/view";
import { WRITING_QUOTES } from "../quotes";

/**
 * Typewriter prompt for the empty page: the placeholder types a prompt, holds
 * it, erases it and moves on to the next one. The timer only runs while the
 * page is empty. With reduced motion, one prompt is shown whole and stays.
 */

const PROMPTS = [
  "What matters today?",
  "- [ ] One thing to finish before lunch",
  "Write it down. Let it go.",
  "# Today",
  "- [ ] Reply to that message you keep putting off",
  "A thought you didn't know you had",
  ...WRITING_QUOTES,
];

const TYPE_MS = 55;
const TYPE_JITTER_MS = 60;
const ERASE_MS = 22;
const HOLD_MS = 2400;
const GAP_MS = 450;

// Stands in for the prompt while nothing is typed. CodeMirror places the caret
// of an empty page from the placeholder's box, and an empty span has no height,
// so the caret would be drawn zero pixels tall and the page would look unfocused.
const ZERO_WIDTH_SPACE = "​";

const shuffled = <T>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const createTypewriter = (phrases: readonly string[]) => {
  const element = document.createElement("span");
  element.className = "cm-typewriter";
  const show = (text: string) => {
    element.textContent = text || ZERO_WIDTH_SPACE;
  };
  show("");
  const order = shuffled(phrases).map((phrase) => Array.from(phrase));
  let phraseIndex = 0;
  let length = 0;
  let erasing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = () => {
    const phrase = order[phraseIndex];
    if (!erasing) {
      length += 1;
      show(phrase.slice(0, length).join(""));
      if (length >= phrase.length) {
        erasing = true;
        timer = setTimeout(tick, HOLD_MS);
        return;
      }
      timer = setTimeout(tick, TYPE_MS + Math.random() * TYPE_JITTER_MS);
      return;
    }
    length -= 1;
    show(phrase.slice(0, length).join(""));
    if (length <= 0) {
      erasing = false;
      phraseIndex = (phraseIndex + 1) % order.length;
      timer = setTimeout(tick, GAP_MS);
      return;
    }
    timer = setTimeout(tick, ERASE_MS);
  };

  const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  return {
    element,
    start: () => {
      if (prefersReducedMotion()) {
        show(order[phraseIndex].join(""));
        return;
      }
      if (timer === undefined) timer = setTimeout(tick, GAP_MS);
    },
    stop: () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
};

export const typewriterPlaceholder = (): Extension => {
  const typewriter = createTypewriter(PROMPTS);
  return [
    // The function form hands CodeMirror the live element; passing the element
    // itself would make CodeMirror show a static clone of it
    placeholder(() => typewriter.element),
    ViewPlugin.define((view) => {
      const sync = (isEmpty: boolean) => (isEmpty ? typewriter.start() : typewriter.stop());
      sync(view.state.doc.length === 0);
      return {
        update(update) {
          if (update.docChanged) sync(update.state.doc.length === 0);
        },
        destroy() {
          typewriter.stop();
        },
      };
    }),
  ];
};
