/**
 * Card.ts — Modelo de Carta de Baraja Española
 * Representa una carta individual con su palo y número.
 */

export type Palo = 'oros' | 'copas' | 'espadas' | 'bastos';

export const PALOS: Palo[] = ['oros', 'copas', 'espadas', 'bastos'];

export const PALO_SYMBOLS: Record<Palo, string> = {
  oros: '🟡',
  copas: '🔴',
  espadas: '🔵',
  bastos: '🟢'
};

export const PALO_NAMES: Record<Palo, string> = {
  oros: 'Oros',
  copas: 'Copas',
  espadas: 'Espadas',
  bastos: 'Bastos'
};

export const NUMERO_NAMES: Record<number, string> = {
  1: 'As',
  2: 'Dos',
  3: 'Tres',
  4: 'Cuatro',
  5: 'Cinco',
  6: 'Seis',
  7: 'Siete',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey'
};

export class Card {
  public numero: number;
  public palo: Palo;
  public id: string;

  constructor(numero: number, palo: Palo) {
    this.numero = numero;
    this.palo = palo;
    this.id = `${numero}_${palo}`;
  }

  /**
   * Valor de la carta para el cálculo de Envido.
   * Figuras (10, 11, 12) valen 0; el resto su valor nominal.
   */
  getEnvidoValue(): number {
    return this.numero >= 10 ? 0 : this.numero;
  }

  /**
   * Nombre legible de la carta.
   * @returns e.g. "As de Espadas"
   */
  getDisplayName(): string {
    return `${NUMERO_NAMES[this.numero] || this.numero} de ${PALO_NAMES[this.palo]}`;
  }

  /**
   * Símbolo del palo para renderizado.
   */
  getSymbol(): string {
    return PALO_SYMBOLS[this.palo];
  }

  /**
   * Verifica si la carta es una carta "especial" fija (no dependiente de la vira).
   * Espadilla (As de Espadas), Bastillo (As de Bastos), 7 de Espadas, 7 de Oros.
   */
  get isFixedSpecial(): boolean {
    return (
      (this.numero === 1 && this.palo === 'espadas') ||
      (this.numero === 1 && this.palo === 'bastos') ||
      (this.numero === 7 && this.palo === 'espadas') ||
      (this.numero === 7 && this.palo === 'oros')
    );
  }

  /**
   * Verifica si esta carta es el Perico dado una vira.
   * Perico = Caballo (11) del palo de la Vira.
   * Si la Vira es 11 (Caballo), el Perico es el Rey (12) del mismo palo.
   */
  isPerico(vira: Card): boolean {
    if (this.palo !== vira.palo) return false;
    if (vira.numero === 11) {
      return this.numero === 12;
    }
    return this.numero === 11;
  }

  /**
   * Verifica si esta carta es la Perica dado una vira.
   * Perica = Sota (10) del palo de la Vira.
   * Si la Vira es 10 (Sota), la Perica es el Rey (12) del mismo palo.
   */
  isPerica(vira: Card): boolean {
    if (this.palo !== vira.palo) return false;
    if (vira.numero === 10) {
      return this.numero === 12;
    }
    return this.numero === 10;
  }

  /**
   * Obtiene el rango de la carta según la jerarquía del Truco Venezolano.
   * Mayor valor = carta más fuerte.
   */
  getRank(vira: Card): number {
    // Perico — máxima carta
    if (this.isPerico(vira)) return 100;
    // Perica
    if (this.isPerica(vira)) return 99;
    // As de Espadas (Espadilla)
    if (this.numero === 1 && this.palo === 'espadas') return 98;
    // As de Bastos (Bastillo)
    if (this.numero === 1 && this.palo === 'bastos') return 97;
    // 7 de Espadas
    if (this.numero === 7 && this.palo === 'espadas') return 96;
    // 7 de Oros
    if (this.numero === 7 && this.palo === 'oros') return 95;
    // Treses
    if (this.numero === 3) return 90;
    // Doses
    if (this.numero === 2) return 85;
    // Ases comunes (Oro y Copa)
    if (this.numero === 1) return 80;
    // Reyes comunes (excluyendo si es pieza)
    if (this.numero === 12) return 75;
    // Caballos comunes
    if (this.numero === 11) return 70;
    // Sotas comunes
    if (this.numero === 10) return 65;
    // 7 comunes (Bastos y Copas)
    if (this.numero === 7) return 60;
    // Seises
    if (this.numero === 6) return 55;
    // Cincos
    if (this.numero === 5) return 50;
    // Cuatros
    if (this.numero === 4) return 45;

    return 0;
  }

  /**
   * Compara esta carta con otra. Retorna positivo si esta es mayor.
   */
  compareTo(other: Card, vira: Card): number {
    return this.getRank(vira) - other.getRank(vira);
  }

  toString(): string {
    return this.getDisplayName();
  }
}
