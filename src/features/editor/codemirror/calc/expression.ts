/**
 * Arithmetic expression evaluator for the inline calculator.
 * Hand-rolled recursive descent parser: no eval(), no dependencies,
 * so arbitrary note content can never execute code.
 *
 * Grammar:
 *   expression := term (("+" | "-") term)*
 *   term       := unary (("*" | "/" | "%") unary)*
 *   unary      := ("-" | "+") unary | exponent    so -2^2 = -(2^2) = -4
 *   exponent   := primary ("^" unary)?            right-associative
 *   primary    := number | name | name "(" args ")" | "(" expression ")"
 */

export type Variables = ReadonlyMap<string, number>;

type Token = { type: "number"; value: number } | { type: "name"; name: string } | { type: "op"; op: string };

// "1,200.50" — comma-grouped numbers must be matched before plain numbers so
// the comma is not consumed as a function-argument separator.
const GROUPED_NUMBER_PATTERN = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?/;
const NUMBER_PATTERN = /^(?:\d+(?:\.\d+)?|\.\d+)/;
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*/;
const OPERATOR_CHARS = new Set(["+", "-", "*", "/", "%", "^", "(", ")", ","]);
// Currency symbols read naturally in notes ("$1,200 * 3") without changing the math.
const IGNORED_CHARS = new Set(["$", "€", "£", "¥", " ", "\t"]);

const CONSTANTS: ReadonlyMap<string, number> = new Map([
  ["pi", Math.PI],
  ["e", Math.E],
]);

const FUNCTIONS: ReadonlyMap<string, (args: number[]) => number | null> = new Map([
  ["sqrt", (args) => (args.length === 1 ? Math.sqrt(args[0]) : null)],
  ["abs", (args) => (args.length === 1 ? Math.abs(args[0]) : null)],
  ["round", (args) => (args.length === 1 ? Math.round(args[0]) : null)],
  ["floor", (args) => (args.length === 1 ? Math.floor(args[0]) : null)],
  ["ceil", (args) => (args.length === 1 ? Math.ceil(args[0]) : null)],
  ["min", (args) => (args.length > 0 ? Math.min(...args) : null)],
  ["max", (args) => (args.length > 0 ? Math.max(...args) : null)],
]);

const tokenize = (input: string): Token[] | null => {
  const tokens: Token[] = [];
  let rest = input;
  while (rest.length > 0) {
    const char = rest[0];
    if (IGNORED_CHARS.has(char)) {
      rest = rest.slice(1);
      continue;
    }
    const grouped = rest.match(GROUPED_NUMBER_PATTERN);
    if (grouped) {
      tokens.push({ type: "number", value: Number.parseFloat(grouped[0].replaceAll(",", "")) });
      rest = rest.slice(grouped[0].length);
      continue;
    }
    const number = rest.match(NUMBER_PATTERN);
    if (number) {
      tokens.push({ type: "number", value: Number.parseFloat(number[0]) });
      rest = rest.slice(number[0].length);
      continue;
    }
    const name = rest.match(NAME_PATTERN);
    if (name) {
      tokens.push({ type: "name", name: name[0] });
      rest = rest.slice(name[0].length);
      continue;
    }
    if (OPERATOR_CHARS.has(char)) {
      tokens.push({ type: "op", op: char });
      rest = rest.slice(1);
      continue;
    }
    return null;
  }
  return tokens;
};

class ParseError extends Error {}

class Parser {
  private position = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly variables: Variables,
  ) {}

  parse(): number {
    const value = this.expression();
    if (this.position < this.tokens.length) {
      throw new ParseError("unconsumed input");
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private takeOp(...ops: string[]): string | null {
    const token = this.peek();
    if (token?.type === "op" && ops.includes(token.op)) {
      this.position++;
      return token.op;
    }
    return null;
  }

  private expression(): number {
    let value = this.term();
    let op = this.takeOp("+", "-");
    while (op) {
      const right = this.term();
      value = op === "+" ? value + right : value - right;
      op = this.takeOp("+", "-");
    }
    return value;
  }

  private term(): number {
    let value = this.unary();
    let op = this.takeOp("*", "/", "%");
    while (op) {
      const right = this.unary();
      value = op === "*" ? value * right : op === "/" ? value / right : value % right;
      op = this.takeOp("*", "/", "%");
    }
    return value;
  }

  private unary(): number {
    const op = this.takeOp("-", "+");
    if (op) {
      const value = this.unary();
      return op === "-" ? -value : value;
    }
    return this.exponent();
  }

  private exponent(): number {
    const base = this.primary();
    if (this.takeOp("^")) {
      return base ** this.unary();
    }
    return base;
  }

  private primary(): number {
    const token = this.peek();
    if (token === undefined) {
      throw new ParseError("unexpected end of input");
    }
    if (token.type === "number") {
      this.position++;
      return token.value;
    }
    if (token.type === "name") {
      this.position++;
      const fn = FUNCTIONS.get(token.name.toLowerCase());
      if (fn && this.takeOp("(")) {
        const args = [this.expression()];
        while (this.takeOp(",")) {
          args.push(this.expression());
        }
        if (!this.takeOp(")")) {
          throw new ParseError("missing closing paren");
        }
        const value = fn(args);
        if (value === null) {
          throw new ParseError("invalid arguments");
        }
        return value;
      }
      const variable = this.variables.get(token.name) ?? CONSTANTS.get(token.name.toLowerCase());
      if (variable === undefined) {
        throw new ParseError(`unknown name: ${token.name}`);
      }
      return variable;
    }
    if (this.takeOp("(")) {
      const value = this.expression();
      if (!this.takeOp(")")) {
        throw new ParseError("missing closing paren");
      }
      return value;
    }
    throw new ParseError(`unexpected token: ${token.op}`);
  }
}

/**
 * Evaluates an arithmetic expression. Returns null when the input is not a
 * valid, fully-consumable expression or the result is not a finite number —
 * callers treat null as "this line is not math".
 */
export const evaluateExpression = (input: string, variables: Variables = new Map()): number | null => {
  const tokens = tokenize(input);
  if (tokens === null || tokens.length === 0) return null;
  try {
    const value = new Parser(tokens, variables).parse();
    return Number.isFinite(value) ? value : null;
  } catch (error) {
    if (error instanceof ParseError) return null;
    throw error;
  }
};
