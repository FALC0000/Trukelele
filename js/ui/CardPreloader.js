/**
 * CardPreloader.js — Precarga de Imágenes de Cartas
 * Descarga y cachea todas las SVGs de cartas al inicio para evitar
 * el efecto de "cartas negras" mientras se cargan las imágenes.
 */

const SUITS = ['clubs', 'coins', 'cups', 'swords'];
const NUMBERS = ['01', '02', '03', '04', '05', '06', '07', '10', '11', '12'];

/**
 * Precarga todas las imágenes de cartas.
 * @param {Function} [onProgress] - Callback (loaded, total) => void
 * @returns {Promise<void>}
 */
export function preloadAllCards(onProgress) {
  const urls = [];

  // Carta de reverso
  urls.push('assets/cards/card_back.svg');

  // Todas las cartas por palo y número
  for (const suit of SUITS) {
    for (const num of NUMBERS) {
      urls.push(`assets/cards/card_${suit}_${num}.svg`);
    }
  }

  let loaded = 0;
  const total = urls.length;

  const promises = urls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (onProgress) onProgress(loaded, total);
        resolve();
      };
      img.onerror = () => {
        loaded++;
        if (onProgress) onProgress(loaded, total);
        resolve(); // No bloquear por imágenes faltantes
      };
      img.src = url;
    });
  });

  return Promise.all(promises);
}
