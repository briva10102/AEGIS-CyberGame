class PuzzleManager {
  static generateMissionPuzzles() {
    const systems = [
      { id: 'COMMS', name: 'Communications Array', node: 'C-04', type: 'network' },
      { id: 'POWER', name: 'Main Power Grid', node: 'P-12', type: 'grid' },
      { id: 'OXYGEN', name: 'Life Support & Oxygen', node: 'O-02', type: 'environment' },
      { id: 'PROPULSION', name: 'Ion Propulsion Drives', node: 'T-09', type: 'thruster' }
    ];

    // Stage 1: Randomize compromised system
    const stage1Target = systems[Math.floor(Math.random() * systems.length)];
    const stage1Nodes = [
      { id: 'A-01', traffic: '18 KB/s', packets: '1,200/s', status: 'NORMAL', compromised: false },
      { id: 'B-03', traffic: '34 KB/s', packets: '2,450/s', status: 'NORMAL', compromised: false },
      { id: stage1Target.node, traffic: '942 KB/s', packets: '84,100/s', status: 'ANOMALOUS', compromised: true },
      { id: 'D-08', traffic: '12 KB/s', packets: '950/s', status: 'NORMAL', compromised: false }
    ];

    // Stage 2: Randomize malware identity
    const malwareProfiles = [
      {
        type: 'TROJAN',
        name: 'Trojan.Orbital.Backdoor',
        description: 'Disguised as an official routine telemetry and maintenance patch.',
        clue: 'Payload masked as maintenance patch v4.11 inside secondary node buffer.',
        weakness: 'FIREWALL',
        sourceNode: 'B-07',
        targetSystem: 'POWER'
      },
      {
        type: 'SPYWARE',
        name: 'Spyware.Telemetry.Siphon',
        description: 'Stealthily logging navigation keys and relaying coordinate packets.',
        clue: 'Unauthorized background process exfiltrating sensor logs and telemetry.',
        weakness: 'ANTIVIRUS',
        sourceNode: 'S-03',
        targetSystem: 'PROPULSION'
      },
      {
        type: 'RANSOMWARE',
        name: 'Cryptor.Lockdown.Lock',
        description: 'Encrypting life support boot sectors and threatening life support lockout.',
        clue: 'Storage partition locked; ransom message broadcast across local bus.',
        weakness: 'ENCRYPTION',
        sourceNode: 'R-09',
        targetSystem: 'OXYGEN'
      }
    ];
    const stage2Data = malwareProfiles[Math.floor(Math.random() * malwareProfiles.length)];

    // Stage 3: Randomized sequence
    const actions = ['ISOLATE', 'REROUTE', 'FIREWALL', 'PURGE'];
    const shuffledSequence = [...actions].sort(() => 0.5 - Math.random());

    // Final Stage Boss Weakpoints
    const bossWeakpoints = ['LEFT_CORE', 'CENTER_CORE', 'RIGHT_CORE'];
    const initialWeakpoint = bossWeakpoints[Math.floor(Math.random() * bossWeakpoints.length)];

    return {
      stage1: {
        targetSystem: stage1Target.id,
        targetNode: stage1Target.node,
        nodes: stage1Nodes,
        hints: [
          'Cyber Analyst: Look for abnormal packet spikes on the network monitor.',
          'Cyber Analyst: Node with over 900 KB/s traffic is the breach point.',
          `Systems Operator: Node ${stage1Target.node} maps directly to ${stage1Target.name}. Isolate it immediately!`
        ]
      },
      stage2: {
        profile: stage2Data,
        hints: [
          'Cyber Analyst: Read the memory footprint clue to identify the malware pattern.',
          `Cyber Analyst: The signature matches a ${stage2Data.type}. Identify the source node (${stage2Data.sourceNode}).`,
          `Systems Operator: Source node ${stage2Data.sourceNode} originates in ${stage2Data.targetSystem}. Deploy ${stage2Data.weakness} countermeasure!`
        ]
      },
      stage3: {
        correctSequence: shuffledSequence,
        hints: [
          'Cyber Analyst: Inspect the containment workflow on your diagnostic panel.',
          'Cyber Analyst: Read the sequence steps one by one to the Systems Operator.',
          `Sequence required: ${shuffledSequence.join(' -> ')}`
        ]
      },
      finalBoss: {
        initialWeakpoint: initialWeakpoint,
        weakpoints: bossWeakpoints,
        bossHp: 100,
        hints: [
          'Cyber Analyst: The APT core shifts vulnerability. Call out the exposed core sector!',
          'Systems Operator: Aim station kinetic battery directly at the core specified by Analyst.',
          `Current exposed vulnerability: ${initialWeakpoint.replace('_', ' ')}`
        ]
      }
    };
  }
}

module.exports = PuzzleManager;