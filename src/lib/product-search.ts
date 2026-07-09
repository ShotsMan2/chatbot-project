const STOP_WORDS = new Set([
  "acaba",
  "hangi",
  "hangi",
  "modelleriniz",
  "modeller",
  "neler",
  "var",
  "mi",
  "mı",
  "ne",
  "bir",
  "senin",
  "sizin",
  "bana",
  "ben",
  "isteyorum",
  "istiyorum",
  "ariyorum",
  "arıyorum",
  "göster",
  "goster",
  "ver",
  "bak",
  "bakiyorum",
  "bakarim",
  "soruyorum",
  "sor",
  "lütfen",
  "lutfen",
  "yardim",
  "yardım"
]);

export function normalizeProductKeyword(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[çğıöşü]/g, (char) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[char] || char))
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .join(" ");
}

export function matchesProductKeyword(keyword: string, productName: string): boolean {
  const normalizedKeyword = normalizeProductKeyword(keyword);
  const normalizedProductName = normalizeProductKeyword(productName);

  if (!normalizedKeyword || !normalizedProductName) {
    return false;
  }

  const keywordTokens = normalizedKeyword.split(" ");
  const productTokens = normalizedProductName.split(" ");

  return keywordTokens.some((token) => productTokens.includes(token));
}
