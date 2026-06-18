export type LayoutDirection = "en-to-ua" | "ua-to-en";

const ENGLISH_KEYS = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./";
const UKRAINIAN_KEYS = "'йцукенгшщзхїфівапролджєячсмитьбю.";

function addCaseVariants(map: Record<string, string>): Record<string, string> {
  for (const [source, target] of Object.entries({ ...map })) {
    if (/\p{L}/u.test(source) && /\p{L}/u.test(target)) {
      map[source.toUpperCase()] = target.toUpperCase();
    }
  }

  return map;
}

function createMap(from: string, to: string): Readonly<Record<string, string>> {
  const fromCharacters = Array.from(from);
  const toCharacters = Array.from(to);

  if (fromCharacters.length !== toCharacters.length) {
    throw new Error("Keyboard layouts must contain the same number of keys");
  }

  const map = Object.fromEntries(
    fromCharacters.map((character, index) => [character, toCharacters[index]]),
  );

  return Object.freeze(addCaseVariants(map));
}

export const EN_TO_UA_MAP = createMap(ENGLISH_KEYS, UKRAINIAN_KEYS);
export const UA_TO_EN_MAP = createMap(UKRAINIAN_KEYS, ENGLISH_KEYS);

