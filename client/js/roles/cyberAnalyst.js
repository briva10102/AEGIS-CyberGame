class CyberAnalystUI {
  static renderStage1(data) {
    const prompt = document.getElementById('cyber-prompt');
    prompt.innerText = 'DETECT: LOCATE SUSPICIOUS NODE IN TOPOLOGY. COMMUNICATE NODE ID TO OPERATOR!';

    const container = document.getElementById('nodes-container');
    container.innerHTML = '';

    data.nodes.forEach((node) => {
      const el = document.createElement('div');
      el.className = `node-item ${node.compromised ? 'anom' : ''}`;
      el.innerHTML = `
        <div class="node-top">
          <span>NODE ${node.id}</span>
          <span style="color: ${node.compromised ? 'var(--accent-red)' : 'var(--accent-green)'}">${node.status}</span>
        </div>
        <div class="node-traffic">TRAFFIC: ${node.traffic} | PACKETS: ${node.packets}</div>
      `;
      el.onclick = () => {
        document.querySelectorAll('.node-item').forEach(n => n.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('inspector-output').innerHTML = `
          <strong>TELEMETRY ANALYSIS FOR NODE ${node.id}</strong><br>
          STATUS: ${node.status}<br>
          PACKET FLOW: ${node.packets}<br>
          DIAGNOSTIC: ${node.compromised ? 'CRITICAL MALICIOUS SURGE DETECTED! Tell Systems Operator to isolate the system associated with Node ' + node.id : 'Nominal telemetry. No unauthorized packets detected.'}
        `;
        soundFX.playBeep(480, 'sine', 0.08);
      };
      container.appendChild(el);
    });
  }

  static renderStage2(data) {
    const prompt = document.getElementById('cyber-prompt');
    prompt.innerText = 'TRACE: ANALYZE MALWARE SIGNATURE. IDENTIFY TYPE AND COMMUNICATE SOURCE NODE!';

    const container = document.getElementById('nodes-container');
    container.innerHTML = `
      <div class="panel-box" style="padding:10px;">
        <h4 style="color: var(--accent-cyan); font-family: var(--font-mono); margin-bottom: 6px;">CAPTURED MALWARE SIGNATURE</h4>
        <p style="font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.5;">
          ${data.profile.clue}<br><br>
          SOURCE NODE: <strong style="color: var(--accent-amber);">${data.profile.sourceNode}</strong><br>
          TARGET BUS: <strong style="color: var(--accent-red);">${data.profile.targetSystem}</strong>
        </p>
      </div>
    `;

    const actions = document.getElementById('cyber-actions-panel');
    actions.innerHTML = `
      <h4 style="font-size: 0.85rem; font-family: var(--font-mono); color: var(--text-muted);">MALWARE TAXONOMY CLASSIFICATION</h4>
      <p style="font-size: 0.8rem; color: #8892b0; margin-bottom: 8px;">
        Instruct Systems Operator on which countermeasure corresponds to this behavior:
      </p>
      <div style="font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.6; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
        - TROJAN: Masks as legitimate maintenance (Counter: FIREWALL)<br>
        - SPYWARE: Stealth telemetry exfiltration (Counter: ANTIVIRUS)<br>
        - RANSOMWARE: Partition locks & threats (Counter: ENCRYPTION)
      </div>
    `;
  }

  static renderStage3(data) {
    const prompt = document.getElementById('cyber-prompt');
    prompt.innerText = 'CONTAIN: READ THE CONTAINMENT SEQUENCE CLEARLY TO THE SYSTEMS OPERATOR!';

    const container = document.getElementById('nodes-container');
    container.innerHTML = `
      <div class="panel-box" style="padding: 14px;">
        <h4 style="color: var(--accent-amber); font-family: var(--font-mono); margin-bottom: 8px;">AUTHORITATIVE OVERRIDE SEQUENCE</h4>
        <ol style="font-family: var(--font-mono); font-size: 0.95rem; line-height: 2; padding-left: 20px;">
          ${data.correctSequence.map(step => `<li style="color: var(--accent-cyan); font-weight:600;">${step}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  static renderBossCombat(data) {
    const prompt = document.getElementById('cyber-prompt');
    prompt.innerText = 'APT VULNERABILITY RADAR ONLINE. SHOUT OUT WEAKPOINT AS IT CYCLES!';

    const bar = document.getElementById('boss-action-bar');
    bar.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 1.1rem; color: var(--accent-cyan); padding: 10px;">
        RADAR VULNERABILITY SCAN: <strong id="analyst-weakpoint-tag" style="color: var(--accent-red); font-size: 1.3rem;">CENTER CORE</strong>
      </div>
    `;
  }

  static updateWeakpoint(weakpoint) {
    const tag = document.getElementById('analyst-weakpoint-tag');
    if (tag) {
      tag.innerText = weakpoint.replace('_', ' ');
      soundFX.playBeep(700, 'sine', 0.1);
    }
  }
}