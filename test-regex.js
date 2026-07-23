const tests = [
  "Deri El Çantası - Premium |Deri El Çantası - Premium (#product:58:1249:1561:4.8:%F0%9F%91%9C)]",
  "[Deri El Çantası - Premium |Deri El Çantası - Premium (#product:58:1249:1561:4.8:%F0%9F%91%9C)]",
  "[Ürün Adı](#product:123)",
  "Ürün Adı (#product:123)",
  "Just a plain #product:123 here"
];

for (let text of tests) {
  let fixed = text;

  // Fix 2: [Name (#product:...)] -> [Name](#product:...)
  fixed = fixed.replace(/\[([^\]]+?)\s*\(\s*(#product:[^)]+)\s*\)\s*\]/g, "[$1]($2)");

  // Fix 1: (#product:...) or (#product:...)] not preceded by ]
  fixed = fixed.replace(/(?<!\])\s*\(\s*(#product:[^)]+)\s*\)\]?/g, " [Ürün]($1) ");
  
  // 1) Fix broken markdown links: "] (" or "]\n(" → "]("
  fixed = fixed.replace(/\]\s*\n\s*\(#product:/g, "](#product:");
  fixed = fixed.replace(/\]\s+\(#product:/g, "](#product:");

  // 2) If LLM wrote plain #product: without markdown link syntax, wrap it
  fixed = fixed.replace(/(?<![\(\:])#product:([^\s\)\n\]]+)/g, "[Ürün](#product:$1)");

  console.log("Original:", text);
  console.log("Fixed:   ", fixed);
  console.log("---");
}
