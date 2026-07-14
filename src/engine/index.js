// @ts-check
/** Point d'entrée du moteur sportif (agrégat). */
export { filtrerExercices, equipementDisponible, estContreIndique, compatibleNiveau } from "./constraints.js";
export { genererProgramme, choisirSplit } from "./generator.js";
export { recommander, incrementCharge, suggererDeload } from "./progression.js";
export { alternatives } from "./replacement.js";
