import { Story } from "@/lib/types";

export function prettyDate(value: string) {
  const d = new Date(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function biasLabel(story: Story) {
  const entries: Array<[string, number]> = [
    ["Left", story.bias.left],
    ["Center", story.bias.center],
    ["Right", story.bias.right],
  ];
  const [side, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return `${value}% ${side}`;
}

export function compactHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}
