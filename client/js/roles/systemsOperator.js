class SystemsOperatorUI {
  static renderStage1(data) {
    const prompt = document.getElementById('sys-prompt');
    prompt.innerText = 'AWAITING COMPROMISED NODE ID FROM CYBER ANALYST. PREPARE TO ISOLATE MATCHING MODULE!';
  }

  static renderStage2(data) {
    const prompt = document.getElementById('sys-prompt');
    prompt.innerText = 'CYBER ANALYST IS EXTRACTING MALWARE SIGNATURE & SOURCE NODE. PREPARE COUNTERMEASURES!';

    const panel = document.getElementById('systems-dynamic-panel');
    panel.innerHTML = `
      <h3>STAGE 2: COUNTERMEASURE DEPLOYMENT DECK</h3>
      <p style="color: #8892b0; margin-bottom: 12px; font-size: 0.9rem;">
        Match the countermeasure and affected module communicated verbally by the Analyst.
      </p>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <select id="counter-type" class="sys-btn" style="flex:1;">
          <option value="ANTIVIRUS">COUNTERMEASURE: ANTIVIRUS PURGE</option>
          <option value="FIREWALL">COUNTERMEASURE: FIREWALL CONTAINMENT</option>
          <option value="ENCRYPTION">COUNTERMEASURE: ENCRYPTED SHIELDING</option>
        </select>
        <select id="counter-sys" class="sys-btn" style="flex:1;">
          <option value="POWER">MODULE: POWER GRID</option>
          <option value="OXYGEN">MODULE: LIFE SUPPORT & OXYGEN</option>
          <option value="COMMS">MODULE: COMMUNICATIONS ARRAY</option>
          <option value="PROPULSION">MODULE: PROPULSION JETS</option>
        </select>
        <button class="primary-btn" onclick="SystemsOperatorUI.submitStage2()">EXECUTE COUNTERMEASURE</button>
      </div>
    `;
  }

  static submitStage2() {
    const type = document.getElementById('counter-type').value;
    const sys = document.getElementById('counter-sys').value;
    let malwareType = 'TROJAN';
    if (type === 'ANTIVIRUS') malwareType = 'SPYWARE';
    if (type === 'ENCRYPTION') malwareType = 'RANSOMWARE';

    Game.sendSystemAction('COUNTERMEASURE', {
      malwareType: malwareType,
      systemId: sys
    });
  }

  static renderStage3(data) {
    const prompt = document.getElementById('sys-prompt');
    prompt.innerText = 'CRITICAL STATION BREACH! FOLLOW THE CONTAINMENT SEQUENCE COMMUNICATED BY ANALYST!';

    const panel = document.getElementById('systems-dynamic-panel');
    panel.innerHTML = `
      <h3>STAGE 3: MANUAL CONTAINMENT OVERRIDE</h3>
      <p style="color: #8892b0; margin-bottom: 12px; font-size: 0.9rem;">
        Execute the exact 4-step sequence as instructed by the Cyber Analyst:
      </p>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <button class="sys-btn" onclick="Game.sendSystemAction('ISOLATE')">1. ISOLATE</button>
        <button class="sys-btn" onclick="Game.sendSystemAction('REROUTE')">2. REROUTE</button>
        <button class="sys-btn" onclick="Game.sendSystemAction('FIREWALL')">3. FIREWALL</button>
        <button class="sys-btn" onclick="Game.sendSystemAction('PURGE')">4. PURGE</button>
      </div>
      <div id="stage3-status" style="margin-top: 12px; font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-cyan);">
        SEQUENCE READY.
      </div>
    `;
  }

  static updateStage3Step(stepIndex, total) {
    const status = document.getElementById('stage3-status');
    if (status) {
      status.innerText = `SEQUENCE PROGRESS: STEP ${stepIndex} OF ${total} ACCEPTED.`;
    }
  }

  static renderBossCombat() {
    const prompt = document.getElementById('sys-prompt');
    prompt.innerText = 'APT DETECTED! CYBER ANALYST WILL CALL OUT THE VULNERABLE CORE. FIRE BATTERY ACCORDINGLY!';

    const bar = document.getElementById('boss-action-bar');
    bar.innerHTML = `
      <button class="primary-btn" onclick="Game.fireBossAttack('LEFT_CORE')">FIRE BATTERY: LEFT CORE</button>
      <button class="primary-btn" onclick="Game.fireBossAttack('CENTER_CORE')">FIRE BATTERY: CENTER CORE</button>
      <button class="primary-btn" onclick="Game.fireBossAttack('RIGHT_CORE')">FIRE BATTERY: RIGHT CORE</button>
    `;
  }
}