/**
 * SoundManager.js — Gestor de Audio y Voz Sintetizada
 * Utiliza Web Audio API para efectos de sonido sintéticos
 * y SpeechSynthesis para los cantos de los jugadores.
 */

export class SoundManager {
  static context = null;

  static initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  /**
   * Sonido sintético de repartir carta (pluck agudo)
   */
  static playDeal() {
    this.initContext();
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /**
   * Sonido sintético de jugar carta (pop rápido)
   */
  static playCardPlay() {
    this.initContext();
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  /**
   * Sonido sintético para victoria (chime alegre)
   */
  static playWin() {
    this.initContext();
    const ctx = this.context;
    const now = ctx.currentTime;

    const playNote = (freq, delay, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playNote(523.25, 0, 0.15); // C5
    playNote(659.25, 0.1, 0.15); // E5
    playNote(783.99, 0.2, 0.15); // G5
    playNote(1046.5, 0.3, 0.3); // C6
  }

  /**
   * Sonido sintético para derrota o no querido (bajada triste)
   */
  static playLose() {
    this.initContext();
    const ctx = this.context;
    const now = ctx.currentTime;

    const playNote = (freq, delay, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.1, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playNote(392.00, 0, 0.2); // G4
    playNote(349.23, 0.15, 0.2); // F4
    playNote(311.13, 0.3, 0.4); // Eb4
  }

  /**
   * Campana o aviso simple
   */
  static playChime() {
    this.initContext();
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  /**
   * Pronuncia un texto (los cantos del juego)
   * @param {string} text - Texto a cantar
   */
  static speak(text) {
    if (!window.speechSynthesis) return;
    
    // Detener cualquier voz previa
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Español general, compatible con la mayoría de navegadores
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Buscar una voz en español si está disponible
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}
