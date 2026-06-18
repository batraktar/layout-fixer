import type { LayoutDirection } from "./layouts";

const LATIN_LETTER = /[A-Za-z]/;
const UKRAINIAN_LETTER = /[А-ЩЬЮЯЄІЇҐа-щьюяєіїґ]/;

export function detectDirection(text: string): LayoutDirection {
  let latinCount = 0;
  let ukrainianCount = 0;

  for (const character of text) {
    if (LATIN_LETTER.test(character)) {
      latinCount += 1;
    } else if (UKRAINIAN_LETTER.test(character)) {
      ukrainianCount += 1;
    }
  }

  return ukrainianCount > latinCount ? "ua-to-en" : "en-to-ua";
}

export default detectDirection;

