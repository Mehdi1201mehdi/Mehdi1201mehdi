// @ts-check
/**
 * GRAPHIQUES — la data-viz maison, sans bibliothèque.
 *
 * Ni Recharts ni Chart.js : quelques centaines d'octets de SVG écrits à la main
 * suffisent, et c'est ce qui permet à l'application de rester sans build et de
 * démarrer hors ligne. Le prix à payer, c'est que chaque graphe doit se défendre
 * lui-même — d'où les décisions écrites là où elles s'appliquent.
 *
 * UN GRAPHE VIDE N'EST PAS UN GRAPHE. Sous deux points, une courbe ne dit rien
 * et un axe seul ressemble à un défaut d'affichage. `svgLine` et `svgBars`
 * rendent alors un ÉTAT VIDE illustré, qui explique quoi faire pour le remplir.
 * C'est pourquoi `etatVideHTML` vit ici : il n'existe que pour eux.
 *
 * Module PUR : il ne rend que des chaînes, c'est l'interface qui les insère.
 */

import { esc } from "./dom.js";
import { illustration } from "./illustrations.js";

export function etatVideHTML(icone, titre, sousTitre = "") {
  return `<div class="empty-state"><div class="es-ic" aria-hidden="true">${icone}</div><b>${esc(titre)}</b>`
    + (sousTitre ? `<span class="muted small">${esc(sousTitre)}</span>` : "") + `</div>`;
}

/** Anneau de progression SVG (0..1) avec texte central. Composant réutilisable. */
export function anneauSVG(pct, taille = 76, texte = "") {
  const r = (taille - 12) / 2, circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(1, pct || 0)));
  const cx = taille / 2;
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}" aria-hidden="true">
    <g transform="rotate(-90 ${cx} ${cx})">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="8"/>
      <circle class="ring-anim" style="--circ:${circ.toFixed(1)};--dashoff:${off.toFixed(1)}" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </g>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="850" fill="var(--ink)">${esc(texte)}</text></svg>`;
}

/**
 * Anneau signature : le composant de pourcentage de l'app.
 *
 * Rendu par un dégradé conique masqué en couronne — donc un seul élément, aucun
 * SVG à recalculer, et un balayage animé gratuit via la propriété enregistrée
 * `--p`. Le centre affiche une VALEUR RÉELLE (« 2 sur 4 ») plutôt qu'un
 * pourcentage : personne ne s'entraîne en pourcentage.
 *
 * @param {number} pct   avancement 0 → 1
 * @param {string} val   grand chiffre au centre
 * @param {string} label libellé sous le chiffre
 * @param {number} [taille] diamètre en px
 */
export function anneauSignature(pct, val, label, taille = 92) {
  const p = Math.round(Math.max(0, Math.min(1, pct || 0)) * 100);
  return `<span class="ringwrap" role="img" aria-label="${esc(val)} ${esc(label)} — ${p} %">
    <span class="ringx" style="--p:${p};--taille:${taille}px"></span>
    <span class="ringval"><b>${esc(val)}</b><span>${esc(label)}</span></span></span>`;
}

export function svgLine(points, label = "") {
  if (points.length < 2) return etatVideHTML(illustration("courbe"), "Ta courbe arrive bientôt", "Enregistre au moins 2 séances pour voir ta tendance se dessiner.");
  // 600 × 150 donnait un ruban de 90 px de haut sur un téléphone : la tendance
  // s'y écrasait. 600 × 195 laisse la courbe respirer sans coûter un écran.
  const W = 600, H = 195, pad = 30;
  const ys = points.map((p) => p.v), ymin = Math.min(...ys), ymax = Math.max(...ys), yr = (ymax - ymin) || 1;
  const X = (i) => pad + (W - 2 * pad) * i / (points.length - 1), Y = (val) => H - pad - (H - 2 * pad) * (val - ymin) / yr;
  const pts = points.map((p, i) => [X(i), Y(p.v)]);
  // Courbe lissée (Catmull-Rom → Bézier cubique) façon « Workout Tracker »
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const uid = "lg" + Math.random().toString(36).slice(2, 8);
  const aire = `${d} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
  // Le dernier point est le SEUL qui compte au premier regard : c'est « où j'en
  // suis ». Il reçoit un halo et un rayon plus large ; les précédents restent
  // des repères discrets sur le trajet.
  const dernier = pts.length - 1;
  const dots = pts.map(([x, y], i) => i === dernier
    ? `<circle class="line-dot dot-fin" style="--i:${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2.5"/>`
    : `<circle class="line-dot" style="--i:${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>`).join("");
  return `<svg class="courbe" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${esc(label)}">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.30"/>
      <stop offset="62%" stop-color="var(--accent)" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
      <filter id="${uid}h" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur stdDeviation="3.4" result="f"/>
        <feMerge><feMergeNode in="f"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <text x="${pad}" y="15" font-size="12" fill="var(--ink-soft)">${esc(label)}</text>
    <text x="2" y="${(Y(ymax) + 4).toFixed(1)}" font-size="11" fill="var(--ink-soft)">${ymax.toFixed(1)}</text>
    <text x="2" y="${(Y(ymin) + 4).toFixed(1)}" font-size="11" fill="var(--ink-soft)">${ymin.toFixed(1)}</text>
    <path class="line-area" d="${aire}" fill="url(#${uid})" stroke="none"/>
    <path class="line-draw" pathLength="1" stroke-dasharray="1" d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#${uid}h)"/>${dots}</svg>`;
}

/** Catégorie d'IMC : libellé + couleur (variable CSS). */
export function categorieIMC(imc) {
  if (imc < 18.5) return { txt: "Insuffisant", col: "var(--amber)" };
  if (imc < 25) return { txt: "Normal", col: "var(--ok)" };
  if (imc < 30) return { txt: "Surpoids", col: "var(--amber)" };
  return { txt: "Obésité", col: "var(--danger)" };
}

/** Jauge IMC en donut (façon carte « BMI »), colorée selon la catégorie. */
export function gaugeIMC(imc, taille = 96) {
  const cat = categorieIMC(imc);
  const r = (taille - 12) / 2, circ = 2 * Math.PI * r, cx = taille / 2;
  // Fraction sur une échelle lisible 15 → 40
  const frac = Math.max(0, Math.min(1, (imc - 15) / 25));
  const off = circ * (1 - frac);
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}" aria-hidden="true">
    <g transform="rotate(-90 ${cx} ${cx})">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="8"/>
      <circle class="ring-anim" style="--circ:${circ.toFixed(1)};--dashoff:${off.toFixed(1)}" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${cat.col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </g>
    <text x="50%" y="46%" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="850" fill="var(--ink)">${imc.toFixed(1)}</text>
    <text x="50%" y="64%" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="var(--ink-soft)">IMC</text></svg>`;
}

export function svgBars(bars, label = "") {
  if (!bars.length) return etatVideHTML(illustration("volumes"), "Rien à afficher pour l'instant", "Tes volumes apparaîtront ici après ta première séance.");
  const W = 600, H = 155, pad = 30, n = bars.length, gap = (W - 2 * pad) / n, bw = gap * 0.6;
  const vmax = Math.max(...bars.map((b) => b.v), 1);
  const rects = bars.map((b, i) => {
    const x = pad + i * gap + (gap - bw) / 2, bh = (H - 2 * pad) * (b.v / vmax);
    return `<rect class="bar-grow" style="--i:${i};transform-origin:${(x + bw / 2).toFixed(1)}px ${(H - pad).toFixed(1)}px" x="${x.toFixed(1)}" y="${(H - pad - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="var(--accent)"/>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${H - pad + 14}" font-size="10" fill="var(--ink-soft)" text-anchor="middle">${esc(b.x)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H + 4}" style="width:100%;height:auto" role="img" aria-label="${esc(label)}"><text x="${pad}" y="15" font-size="12" fill="var(--ink-soft)">${esc(label)}</text>${rects}</svg>`;
}

/**
 * SPARKLINE DE FOND — une courbe d'aire sans axe, sans repère, sans étiquette.
 *
 * Ce n'est pas un graphique : c'est une TEXTURE qui porte du sens. Elle se pose
 * derrière un chiffre, touche les bords de sa tuile, et donne au regard la forme
 * d'une progression avant même qu'il ait lu le nombre. Un graphique lisible à
 * cet endroit volerait la vedette au chiffre ; ici la silhouette suffit.
 *
 * `preserveAspectRatio="none"` est volontaire : la courbe s'étire pour remplir
 * la tuile quelle que soit sa largeur, ce qui serait faux pour une data-viz mais
 * juste pour un fond.
 *
 * @param {number[]} valeurs  série chronologique, la plus ancienne d'abord
 * @returns {string} SVG, ou chaîne vide si la série ne dit rien
 */
export function sparkAire(valeurs) {
  const v = (Array.isArray(valeurs) ? valeurs : []).map(Number).filter(Number.isFinite);
  if (v.length < 3) return "";
  const W = 300, H = 90;
  const max = Math.max(...v), min = Math.min(...v);
  // Base à zéro quand la série touche le zéro : un trou dans l'entraînement doit
  // se voir comme un creux jusqu'en bas, pas comme un simple plateau bas.
  const bas = min > 0 && max / min < 4 ? min : 0;
  const ech = (max - bas) || 1;
  const X = (i) => (W * i) / (v.length - 1);
  const Y = (n) => H - (H - 6) * ((n - bas) / ech);
  const pts = v.map((n, i) => [X(i), Y(n)]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}`
      + ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}`
      + ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const uid = "sp" + Math.random().toString(36).slice(2, 8);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity=".34"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${W},${H} L0,${H} Z" fill="url(#${uid})"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-opacity=".62"
      stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
