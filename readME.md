# AEGIS-7: ORBITAL BREACH
### MOSAIC 2026 — Two-Player Cooperative Cybersecurity Game
*Two Operators. One Station. Three Minutes.*

A browser-based asymmetric multiplayer game engineered for local festival deployment. Players collaborate across two dedicated laptops over LAN without cloud dependencies or complex setup.

---

## Key Features
- **Asymmetric Cooperative Roles:** Systems Operator (Station physical infrastructure) & Cyber Analyst (Tactical SOC & network traffic).
- **Hard 3-Minute Synchronized Countdown:** Authoritative server-timed loop.
- **Three Progressive Stages & Boss Encounter:**
  1. *Detect:* Identify anomalous nodes and isolate compromised modules.
  2. *Trace:* Match polymorphic malware signatures and classify threats (Trojan, Spyware, Ransomware).
  3. *Contain:* Execute time-critical containment routing sequences.
  4. *APT Boss:* Interactive HTML5 Canvas battle requiring real-time weakpoint communication.
- **Procedural Mission Randomization:** Puzzles, node maps, and weak points dynamically shuffle between sessions.
- **Built-in Audio & Hint Systems:** Zero-dependency procedural Web Audio API synthesis and non-punitive tiered hints.
- **Instant Session Reset:** No page reloads required between participant pairs.

---

## Tech Stack
- **Backend:** Node.js, Express, `ws` (WebSocket)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas, Modern CSS Flex/Grid
- **Dependencies:** None beyond `express` and `ws`

---

## Installation & Local Deployment

### 1. Clone & Install
```bash
git clone [https://github.com/your-username/aegis-7-orbital-breach.git](https://github.com/your-username/aegis-7-orbital-breach.git)
cd aegis-7-orbital-breach
npm install