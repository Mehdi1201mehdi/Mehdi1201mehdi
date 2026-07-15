// @ts-check
/**
 * Base alimentaire locale (valeurs pour 100 g, crues sauf mention).
 * Données nutritionnelles factuelles, rédigées pour ce projet. Sert de repli
 * hors ligne et de recherche instantanée quand Open Food Facts n'est pas joignable.
 */

/** @type {{id:string,n:string,kcal:number,p:number,c:number,l:number,note?:string}[]} */
export const FOODS = [
  { id: "oeuf", n: "Œuf entier", kcal: 143, p: 12.6, c: 0.7, l: 9.9, note: "1 œuf ≈ 60 g" },
  { id: "poulet", n: "Blanc de poulet (cru)", kcal: 106, p: 22, c: 0, l: 1.8, note: "cuit ≈ −25 % de poids" },
  { id: "dinde", n: "Escalope de dinde (crue)", kcal: 105, p: 24, c: 0, l: 1 },
  { id: "steak5", n: "Steak haché 5 % (cru)", kcal: 129, p: 21, c: 0, l: 5 },
  { id: "cabillaud", n: "Cabillaud (cru)", kcal: 82, p: 18, c: 0, l: 0.7 },
  { id: "saumon", n: "Saumon (cru)", kcal: 200, p: 20, c: 0, l: 13 },
  { id: "thon", n: "Thon au naturel (égoutté)", kcal: 110, p: 25, c: 0, l: 1 },
  { id: "fb0", n: "Fromage blanc 0 %", kcal: 47, p: 8, c: 4, l: 0.2 },
  { id: "skyr", n: "Skyr nature", kcal: 57, p: 10, c: 4, l: 0.2 },
  { id: "yg", n: "Yaourt grec nature", kcal: 97, p: 9, c: 3.5, l: 5 },
  { id: "lait", n: "Lait demi-écrémé", kcal: 46, p: 3.2, c: 4.8, l: 1.5, note: "100 ml" },
  { id: "whey", n: "Whey protéine (poudre)", kcal: 380, p: 75, c: 8, l: 6, note: "1 dose ≈ 30 g" },
  { id: "riz", n: "Riz blanc (cru)", kcal: 350, p: 7, c: 78, l: 0.6, note: "cuit ≈ ×2,8" },
  { id: "rizc", n: "Riz blanc (cuit)", kcal: 130, p: 2.6, c: 28, l: 0.2 },
  { id: "pates", n: "Pâtes (crues)", kcal: 360, p: 12, c: 72, l: 1.5, note: "cuites ≈ ×2,4" },
  { id: "patesc", n: "Pâtes (cuites)", kcal: 150, p: 5, c: 30, l: 0.9 },
  { id: "pdt", n: "Pommes de terre (crues)", kcal: 80, p: 2, c: 17, l: 0.1 },
  { id: "avoine", n: "Flocons d'avoine", kcal: 370, p: 13, c: 60, l: 7 },
  { id: "pain", n: "Pain complet", kcal: 250, p: 9, c: 43, l: 3.5 },
  { id: "lentilles", n: "Lentilles (cuites)", kcal: 115, p: 9, c: 17, l: 0.4 },
  { id: "poisch", n: "Pois chiches (cuits)", kcal: 140, p: 8, c: 21, l: 2.5 },
  { id: "legumes", n: "Légumes verts (moyenne)", kcal: 30, p: 2, c: 4, l: 0.2 },
  { id: "banane", n: "Banane", kcal: 90, p: 1, c: 20, l: 0.3 },
  { id: "pomme", n: "Pomme", kcal: 52, p: 0.3, c: 12, l: 0.2 },
  { id: "ho", n: "Huile d'olive", kcal: 900, p: 0, c: 0, l: 100 },
  { id: "amandes", n: "Amandes", kcal: 600, p: 21, c: 8, l: 52 },
  { id: "noix", n: "Noix", kcal: 650, p: 15, c: 7, l: 63 },
  { id: "beurre", n: "Beurre", kcal: 740, p: 0.7, c: 0.6, l: 82 },
  { id: "fromage", n: "Emmental", kcal: 380, p: 28, c: 1, l: 29 },
  { id: "jambon", n: "Jambon blanc", kcal: 110, p: 20, c: 1, l: 3 },
  { id: "miel", n: "Miel", kcal: 320, p: 0.3, c: 80, l: 0 },
];

function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

/** Recherche dans la base locale (insensible aux accents). */
export function chercherFoods(q, list = FOODS) {
  const n = norm(q);
  if (!n) return [];
  return list.filter((f) => norm(f.n).includes(n)).map((f) => ({ n: f.n, kcal: f.kcal, p: f.p, c: f.c, l: f.l, src: "local", note: f.note }));
}

/** Calcule les macros d'une portion (grammes) à partir d'un aliment /100 g. */
export function portion(per100, grammes) {
  const k = grammes / 100;
  return {
    kcal: Math.round(per100.kcal * k), p: Math.round(per100.p * k),
    c: Math.round(per100.c * k), l: Math.round(per100.l * k),
  };
}
