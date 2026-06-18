import { detectDirection } from "./detectDirection";
import {
  EN_TO_UA_MAP,
  UA_TO_EN_MAP,
  type LayoutDirection,
} from "./layouts";

export function convertLayout(
  text: string,
  direction: LayoutDirection = detectDirection(text),
): string {
  const layoutMap = direction === "en-to-ua" ? EN_TO_UA_MAP : UA_TO_EN_MAP;

  return Array.from(text, (character) => layoutMap[character] ?? character).join("");
}

export default convertLayout;

