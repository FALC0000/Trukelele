/**
 * ScoreboardRenderer.js — Renderizado del Marcador Visual
 * Dibuja los puntos usando la representación tradicional de "porotos/fósforos" agrupados de a 5.
 */

export class ScoreboardRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Contenedor de scoreboard no encontrado: ${containerId}`);
    
    this.elements = {
      t1Name: null,
      t2Name: null,
      t1PointsText: null,
      t2PointsText: null,
      t1Tally: null,
      t2Tally: null,
      historyList: null,
      targetScore: null,
    };
  }

  init(team1Name, team2Name, targetScore) {
    this.container.innerHTML = `
      <div class="scoreboard-panel">
        <div class="scoreboard-header">
          <div class="scoreboard-title">Puntuación</div>
          <div class="scoreboard-target" id="score-target">A ${targetScore} pts</div>
        </div>
        
        <div class="scoreboard-teams">
          <!-- Equipo 1 -->
          <div class="team-score">
            <div class="team-score__header">
              <span class="team-score__name" id="t1-name">${team1Name}</span>
              <span class="team-score__points" id="t1-pts">0</span>
            </div>
            <div class="tally-container" id="t1-tally"></div>
          </div>
          
          <!-- Equipo 2 -->
          <div class="team-score">
            <div class="team-score__header">
              <span class="team-score__name" id="t2-name">${team2Name}</span>
              <span class="team-score__points" id="t2-pts">0</span>
            </div>
            <div class="tally-container" id="t2-tally"></div>
          </div>
        </div>
        
        <!-- Historial -->
        <div class="history-panel" id="score-history">
          <!-- Items generados dinámicamente -->
        </div>
      </div>
    `;

    this.elements.t1Name = document.getElementById('t1-name');
    this.elements.t2Name = document.getElementById('t2-name');
    this.elements.t1PointsText = document.getElementById('t1-pts');
    this.elements.t2PointsText = document.getElementById('t2-pts');
    this.elements.t1Tally = document.getElementById('t1-tally');
    this.elements.t2Tally = document.getElementById('t2-tally');
    this.elements.historyList = document.getElementById('score-history');
    this.elements.targetScore = document.getElementById('score-target');
  }

  update(scores, targetScore, teamNames) {
    if (teamNames) {
      this.elements.t1Name.textContent = teamNames[0];
      this.elements.t2Name.textContent = teamNames[1];
    }
    
    this.elements.targetScore.textContent = `A ${targetScore} pts`;
    
    this._updateTeamScore('team1', scores.team1, targetScore);
    this._updateTeamScore('team2', scores.team2, targetScore);
  }

  _updateTeamScore(teamId, points, targetScore) {
    const ptsText = teamId === 'team1' ? this.elements.t1PointsText : this.elements.t2PointsText;
    const tallyContainer = teamId === 'team1' ? this.elements.t1Tally : this.elements.t2Tally;
    
    // Animar el texto si cambió
    if (ptsText.textContent !== points.toString()) {
      ptsText.textContent = points;
      ptsText.classList.remove('anim-score-pop');
      void ptsText.offsetWidth; // trigger reflow
      ptsText.classList.add('anim-score-pop');
    }
    
    // Dibujar palitos (tally marks)
    tallyContainer.innerHTML = '';
    
    // Si se juega a 24, hay "malas" (1-12) y "buenas" (13-24)
    const hasMalasBuenas = targetScore === 24;
    const halfScore = targetScore / 2;
    
    // Dibujar Malas (o puntos totales si no hay mitad)
    const malasPoints = hasMalasBuenas ? Math.min(points, halfScore) : points;
    this._renderTallyMarks(tallyContainer, malasPoints);
    
    // Dibujar Buenas
    if (hasMalasBuenas) {
      const divider = document.createElement('div');
      divider.className = 'tally-divider';
      tallyContainer.appendChild(divider);
      
      if (points > halfScore) {
        tallyContainer.parentElement.classList.add('tally-container--buenas');
        this._renderTallyMarks(tallyContainer, points - halfScore);
      } else {
        tallyContainer.parentElement.classList.remove('tally-container--buenas');
      }
    }
  }

  _renderTallyMarks(container, points) {
    const fullGroups = Math.floor(points / 5);
    const remainder = points % 5;
    
    // Dibujar grupos de 5 completos
    for (let i = 0; i < fullGroups; i++) {
      container.appendChild(this._createTallyGroup(5));
    }
    
    // Dibujar grupo restante
    if (remainder > 0) {
      container.appendChild(this._createTallyGroup(remainder));
    }
  }

  _createTallyGroup(count) {
    const group = document.createElement('div');
    group.className = 'tally-group';
    
    for (let i = 1; i <= count; i++) {
      const line = document.createElement('div');
      line.className = `tally-line tally-line--${i}`;
      group.appendChild(line);
    }
    
    return group;
  }

  addHistoryItem(teamName, points, reason) {
    const item = document.createElement('div');
    item.className = 'history-item anim-fade-in';
    item.innerHTML = `
      <span><span class="history-item__team">${teamName}</span>: ${reason}</span>
      <span class="history-item__points">+${points}</span>
    `;
    
    this.elements.historyList.prepend(item);
  }
}
