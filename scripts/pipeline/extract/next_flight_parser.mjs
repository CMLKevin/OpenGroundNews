function skipWs(input, i) {
  let idx = i;
  while (idx < input.length && /\s/.test(input[idx])) idx += 1;
  return idx;
}

function parseString(input, i) {
  const quote = input[i];
  let idx = i + 1;
  let out = "";
  let escaped = false;
  while (idx < input.length) {
    const ch = input[idx];
    idx += 1;
    if (escaped) {
      if (ch === "n") out += "\n";
      else if (ch === "r") out += "\r";
      else if (ch === "t") out += "\t";
      else out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === quote) {
      return { value: out, next: idx };
    }
    out += ch;
  }
  return null;
}

function parseNumber(input, i) {
  const match = input.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  if (!match) return null;
  return { value: Number(match[0]), next: i + match[0].length };
}

function parseLiteral(input, i) {
  if (input.startsWith("true", i)) return { value: true, next: i + 4 };
  if (input.startsWith("false", i)) return { value: false, next: i + 5 };
  if (input.startsWith("null", i)) return { value: null, next: i + 4 };
  return null;
}

function parseNested(input, i, open, close) {
  let idx = i;
  let depth = 0;
  let inString = null;
  let escaped = false;
  while (idx < input.length) {
    const ch = input[idx];
    idx += 1;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === open) depth += 1;
    if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return { value: input.slice(i, idx), next: idx };
      }
    }
  }
  return null;
}

function parseValue(input, i) {
  let idx = skipWs(input, i);
  if (idx >= input.length) return null;
  const ch = input[idx];

  if (ch === "\"" || ch === "'") return parseString(input, idx);
  if (ch === "[" || ch === "{") {
    const nested = parseNested(input, idx, ch, ch === "[" ? "]" : "}");
    if (!nested) return null;
    // Keep nested values as raw JSON-ish strings; callers only need top-level slots.
    return nested;
  }
  if (ch === "-" || /\d/.test(ch)) return parseNumber(input, idx);

  const literal = parseLiteral(input, idx);
  if (literal) return literal;

  return null;
}

function stripOuterParens(input) {
  let value = input.trim();
  while (value.startsWith("(") && value.endsWith(")")) {
    let depth = 0;
    let valid = true;
    let inString = null;
    let escaped = false;
    for (let i = 0; i < value.length; i += 1) {
      const ch = value[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === inString) inString = null;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        inString = ch;
        continue;
      }
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      if (depth === 0 && i < value.length - 1) {
        valid = false;
        break;
      }
    }
    if (!valid || depth !== 0) break;
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function parseNextFlightPushExpression(expression) {
  const clean = stripOuterParens(String(expression || ""));
  if (!clean.startsWith("[") || !clean.endsWith("]")) return null;

  const out = [];
  let idx = 1;

  while (idx < clean.length - 1) {
    idx = skipWs(clean, idx);
    if (idx >= clean.length - 1) break;
    if (clean[idx] === ",") {
      idx += 1;
      continue;
    }

    const parsed = parseValue(clean, idx);
    if (!parsed) return null;
    out.push(parsed.value);
    idx = skipWs(clean, parsed.next);
    if (clean[idx] === ",") idx += 1;
  }

  return out;
}
