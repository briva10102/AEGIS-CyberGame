const PuzzleManager = require('./puzzleManager');

class GameManager {
    constructor(wss) {
        this.wss = wss;

        // Every connected browser is associated with exactly one room.
        this.clients = new Map();
        this.rooms = new Map();

        this.initWebSocket();
    }

    // ============================================================
    // WEBSOCKET CONNECTIONS
    // ============================================================

    initWebSocket() {
        this.wss.on('connection', (ws) => {
            this.clients.set(ws, {
                roomId: null,
                role: null,
                ready: false
            });

            this.sendTo(ws, {
                type: 'CONNECTION_INIT',
                data: {
                    connected: true
                }
            });

            ws.on('message', (message) => {
                try {
                    const packet = JSON.parse(message);
                    this.handlePacket(ws, packet);
                } catch (err) {
                    console.error('[WS] Packet parsing error:', err);
                    this.sendTo(ws, {
                        type: 'SERVER_ERROR',
                        message: 'Invalid server packet.'
                    });
                }
            });

            ws.on('close', () => {
                this.handleDisconnect(ws);
            });

            ws.on('error', (err) => {
                console.error('[WS] Client socket error:', err.message);
            });
        });
    }

    // ============================================================
    // PACKET ROUTER
    // ============================================================

    handlePacket(ws, packet) {
        const client = this.clients.get(ws);

        if (!client) return;

        switch (packet.type) {
            case 'CREATE_ROOM':
                this.createRoom(ws);
                break;

            case 'JOIN_ROOM':
                this.joinRoom(ws, packet.roomCode);
                break;

            case 'SELECT_ROLE':
                this.handleRoleSelection(ws, packet.role);
                break;

            case 'READY_TOGGLE':
                this.handleReadyToggle(ws);
                break;

            case 'REQUEST_HINT':
                this.handleHintRequest(ws, packet.stage);
                break;

            case 'SYSTEM_ACTION':
                this.handleSystemAction(ws, packet.action, packet.payload);
                break;

            case 'BOSS_ATTACK':
                this.handleBossAttack(ws, packet.targetCore);
                break;

            case 'RESET_GAME':
                this.resetGame(ws);
                break;

            default:
                this.sendTo(ws, {
                    type: 'SERVER_ERROR',
                    message: `Unknown packet type: ${packet.type}`
                });
        }
    }

    // ============================================================
    // ROOM CREATION / JOINING
    // ============================================================

    createRoom(ws) {
        const client = this.clients.get(ws);

        if (!client) return;

        // If this browser is already inside a room, don't create another.
        if (client.roomId) {
            this.sendTo(ws, {
                type: 'ROOM_ERROR',
                message: `You are already connected to room ${client.roomId}.`
            });
            return;
        }

        const roomCode = this.generateRoomCode();

        const room = this.createRoomState(roomCode);

        this.rooms.set(roomCode, room);

        client.roomId = roomCode;

        room.clients.add(ws);

        this.sendTo(ws, {
            type: 'ROOM_CREATED',
            roomCode
        });

        this.sendRoomState(roomCode);
    }

    joinRoom(ws, requestedCode) {
        const client = this.clients.get(ws);

        if (!client) return;

        if (client.roomId) {
            this.sendTo(ws, {
                type: 'ROOM_ERROR',
                message: `You are already connected to room ${client.roomId}.`
            });
            return;
        }

        const roomCode = String(requestedCode || '')
            .trim()
            .toUpperCase();

        if (!roomCode) {
            this.sendTo(ws, {
                type: 'ROOM_ERROR',
                message: 'Enter a mission room code.'
            });
            return;
        }

        const room = this.rooms.get(roomCode);

        if (!room) {
            this.sendTo(ws, {
                type: 'ROOM_ERROR',
                message: 'Mission room not found. Check the code and try again.'
            });
            return;
        }

        if (room.state !== 'LOBBY') {
            this.sendTo(ws, {
                type: 'ROOM_ERROR',
                message: 'This mission has already started. Create a new room.'
            });
            return;
        }

        if (room.clients.size >= 2) {
            this.sendTo(ws, {
                type: 'ROOM_ERROR',
                message: 'This mission room already has two operators.'
            });
            return;
        }

        client.roomId = roomCode;
        room.clients.add(ws);

        this.sendTo(ws, {
            type: 'ROOM_JOINED',
            roomCode
        });

        this.sendRoomState(roomCode);
    }

    createRoomState(roomCode) {
        return {
            code: roomCode,

            clients: new Set(),

            state: 'LOBBY',
            stage: 1,

            timeRemaining: 180,
            timerInterval: null,

            puzzles: null,

            stats: {
                hintsUsed: 0,
                errors: 0,
                threatsNeutralized: 0,
                startTime: 0,
                endTime: 0
            },

            stage3CurrentIndex: 0,

            bossState: {
                hp: 100,
                weakpoint: 'CENTER_CORE'
            }
        };
    }

    generateRoomCode() {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

        let code;

        do {
            code = '';

            for (let i = 0; i < 4; i++) {
                code += characters[Math.floor(Math.random() * characters.length)];
            }
        } while (this.rooms.has(code));

        return code;
    }

    // ============================================================
    // ROLE MANAGEMENT
    // ============================================================

    handleRoleSelection(ws, requestedRole) {
        const client = this.clients.get(ws);

        if (!client || !client.roomId) {
            this.sendTo(ws, {
                type: 'ROLE_ERROR',
                message: 'Join or create a mission room first.'
            });
            return;
        }

        const room = this.rooms.get(client.roomId);

        if (!room || room.state !== 'LOBBY') {
            this.sendTo(ws, {
                type: 'ROLE_ERROR',
                message: 'Roles cannot be changed after the mission starts.'
            });
            return;
        }

        const validRoles = [
            'SYSTEMS_OPERATOR',
            'CYBER_ANALYST'
        ];

        if (!validRoles.includes(requestedRole)) {
            this.sendTo(ws, {
                type: 'ROLE_ERROR',
                message: 'Invalid operator role.'
            });
            return;
        }

        // Prevent duplicate roles.
        for (const socket of room.clients) {
            if (socket === ws) continue;

            const info = this.clients.get(socket);

            if (info && info.role === requestedRole) {
                this.sendTo(ws, {
                    type: 'ROLE_ERROR',
                    message: `Role ${requestedRole.replace('_', ' ')} is already occupied!`
                });
                return;
            }
        }

        client.role = requestedRole;
        client.ready = false;

        this.sendTo(ws, {
            type: 'ROLE_CONFIRMED',
            role: requestedRole
        });

        this.sendRoomState(client.roomId);
    }

    handleReadyToggle(ws) {
        const client = this.clients.get(ws);

        if (!client || !client.roomId) {
            return;
        }

        const room = this.rooms.get(client.roomId);

        if (!room || room.state !== 'LOBBY') {
            return;
        }

        if (!client.role) {
            this.sendTo(ws, {
                type: 'ROLE_ERROR',
                message: 'Select an operator role before confirming readiness.'
            });
            return;
        }

        client.ready = !client.ready;

        this.sendRoomState(client.roomId);

        this.checkGameStart(room);
    }

    // ============================================================
    // LOBBY STATE
    // ============================================================

    sendRoomState(roomCode) {
        const room = this.rooms.get(roomCode);

        if (!room) return;

        let systemsOperator = false;
        let cyberAnalyst = false;

        let systemsReady = false;
        let cyberReady = false;

        for (const socket of room.clients) {
            const info = this.clients.get(socket);

            if (!info) continue;

            if (info.role === 'SYSTEMS_OPERATOR') {
                systemsOperator = true;
                systemsReady = info.ready;
            }

            if (info.role === 'CYBER_ANALYST') {
                cyberAnalyst = true;
                cyberReady = info.ready;
            }
        }

        const lobbyData = {
            roomCode,

            playerCount: room.clients.size,

            systemsOperator,
            systemsReady,

            cyberAnalyst,
            cyberReady,

            canStart:
                room.clients.size === 2 &&
                systemsOperator &&
                cyberAnalyst &&
                systemsReady &&
                cyberReady
        };

        this.broadcastToRoom(roomCode, {
            type: 'LOBBY_UPDATE',
            data: lobbyData
        });
    }

    checkGameStart(room) {
        if (!room) return;

        if (room.state !== 'LOBBY') {
            return;
        }

        if (room.clients.size !== 2) {
            return;
        }

        let systemsReady = false;
        let cyberReady = false;

        for (const socket of room.clients) {
            const client = this.clients.get(socket);

            if (!client) continue;

            if (
                client.role === 'SYSTEMS_OPERATOR' &&
                client.ready
            ) {
                systemsReady = true;
            }

            if (
                client.role === 'CYBER_ANALYST' &&
                client.ready
            ) {
                cyberReady = true;
            }
        }

        if (systemsReady && cyberReady) {
            this.startMission(room);
        }
    }

    // ============================================================
    // MISSION START
    // ============================================================

    startMission(room) {
        room.state = 'RUNNING';
        room.stage = 1;
        room.timeRemaining = 180;

        room.stats = {
            hintsUsed: 0,
            errors: 0,
            threatsNeutralized: 0,
            startTime: Date.now(),
            endTime: 0
        };

        room.stage3CurrentIndex = 0;

        room.puzzles = PuzzleManager.generateMissionPuzzles();

        room.bossState.hp = room.puzzles.finalBoss.bossHp;
        room.bossState.weakpoint =
            room.puzzles.finalBoss.initialWeakpoint;

        this.broadcastToRoom(room.code, {
            type: 'MISSION_START',
            stage: room.stage,
            timeRemaining: room.timeRemaining,
            puzzles: room.puzzles
        });

        clearInterval(room.timerInterval);

        room.timerInterval = setInterval(() => {
            if (room.state !== 'RUNNING') {
                clearInterval(room.timerInterval);
                room.timerInterval = null;
                return;
            }

            room.timeRemaining--;

            this.broadcastToRoom(room.code, {
                type: 'TIMER_TICK',
                timeRemaining: room.timeRemaining
            });

            if (room.timeRemaining <= 0) {
                this.missionFailed(room, 'TIME_EXPIRED');
            }
        }, 1000);
    }

    // ============================================================
    // HINTS
    // ============================================================

    handleHintRequest(ws, stage) {
        const client = this.clients.get(ws);

        if (!client || !client.roomId) return;

        const room = this.rooms.get(client.roomId);

        if (!room || room.state !== 'RUNNING') return;

        room.stats.hintsUsed++;

        let hintText = '';

        const stageNumber = Number(stage);

        const puzzle =
            stageNumber === 4
                ? room.puzzles?.finalBoss
                : room.puzzles?.[`stage${stageNumber}`];

        if (puzzle && puzzle.hints) {
            const index = Math.min(
                room.stats.hintsUsed - 1,
                puzzle.hints.length - 1
            );

            hintText =
                puzzle.hints[index] ||
                puzzle.hints[puzzle.hints.length - 1];
        }

        this.broadcastToRoom(room.code, {
            type: 'HINT_DELIVERED',
            hint: hintText,
            totalHintsUsed: room.stats.hintsUsed
        });
    }

    // ============================================================
    // SYSTEM ACTIONS
    // ============================================================

    handleSystemAction(ws, action, payload = {}) {
        const client = this.clients.get(ws);

        if (!client || !client.roomId) return;

        const room = this.rooms.get(client.roomId);

        if (!room || room.state !== 'RUNNING') return;

        // Only Systems Operator should perform physical system actions.
        if (client.role !== 'SYSTEMS_OPERATOR') {
            this.sendTo(ws, {
                type: 'OPERATIONAL_ERROR',
                message: 'Only the Systems Operator can execute station controls.',
                errors: room.stats.errors
            });
            return;
        }

        if (room.stage === 1) {
            if (
                action === 'ISOLATE' &&
                payload.systemId === room.puzzles.stage1.targetSystem
            ) {
                room.stats.threatsNeutralized++;
                room.stage = 2;

                this.broadcastToRoom(room.code, {
                    type: 'STAGE_CLEARED',
                    stage: 1,
                    nextStage: 2,
                    message:
                        `Station ${payload.systemId} isolated! Anomaly signature isolated.`
                });
            } else {
                this.recordError(
                    room,
                    'Incorrect module isolation! Diagnostic telemetry scrambled.'
                );
            }
        }

        else if (room.stage === 2) {
            if (
                action === 'COUNTERMEASURE' &&
                payload.malwareType === room.puzzles.stage2.profile.type &&
                payload.systemId === room.puzzles.stage2.profile.targetSystem
            ) {
                room.stats.threatsNeutralized++;
                room.stage = 3;
                room.stage3CurrentIndex = 0;

                this.broadcastToRoom(room.code, {
                    type: 'STAGE_CLEARED',
                    stage: 2,
                    nextStage: 3,
                    message:
                        `${payload.malwareType} threat neutralized at source!`
                });
            } else {
                this.recordError(
                    room,
                    'Wrong countermeasure payload or system assignment!'
                );
            }
        }

        else if (room.stage === 3) {
            const expected =
                room.puzzles.stage3.correctSequence[
                room.stage3CurrentIndex
                ];

            if (action === expected) {
                room.stage3CurrentIndex++;

                this.broadcastToRoom(room.code, {
                    type: 'STAGE3_STEP_SUCCESS',
                    step: action,
                    stepIndex: room.stage3CurrentIndex,
                    totalSteps:
                        room.puzzles.stage3.correctSequence.length
                });

                if (
                    room.stage3CurrentIndex >=
                    room.puzzles.stage3.correctSequence.length
                ) {
                    room.stats.threatsNeutralized++;
                    room.stage = 4;

                    this.broadcastToRoom(room.code, {
                        type: 'STAGE_CLEARED',
                        stage: 3,
                        nextStage: 4,
                        message:
                            'Breach contained. ALERT: HIGH-THREAT APT HOSTILE SIGNATURE DETECTED!'
                    });
                }
            } else {
                room.stage3CurrentIndex = 0;

                this.recordError(
                    room,
                    'Sequence violation! Containment sequence reset to Step 1.'
                );

                this.broadcastToRoom(room.code, {
                    type: 'STAGE3_RESET'
                });
            }
        }
    }

    // ============================================================
    // BOSS
    // ============================================================

    handleBossAttack(ws, targetCore) {
        const client = this.clients.get(ws);

        if (!client || !client.roomId) return;

        const room = this.rooms.get(client.roomId);

        if (!room || room.state !== 'RUNNING') return;

        // Only Systems Operator controls the physical attack.
        if (client.role !== 'SYSTEMS_OPERATOR') {
            this.sendTo(ws, {
                type: 'OPERATIONAL_ERROR',
                message:
                    'Only the Systems Operator can fire the kinetic defense battery.',
                errors: room.stats.errors
            });
            return;
        }

        if (room.stage !== 4) return;

        if (targetCore === room.bossState.weakpoint) {
            room.bossState.hp -= 25;

            const weakpoints =
                room.puzzles.finalBoss.weakpoints;

            room.bossState.weakpoint =
                weakpoints[
                Math.floor(Math.random() * weakpoints.length)
                ];

            this.broadcastToRoom(room.code, {
                type: 'BOSS_HIT',
                hp: Math.max(0, room.bossState.hp),
                newWeakpoint: room.bossState.weakpoint
            });

            if (room.bossState.hp <= 0) {
                this.missionVictory(room);
            }
        } else {
            this.recordError(
                room,
                'Kinetic battery missed vulnerable node! Kinetic deflection damage.'
            );
        }
    }

    // ============================================================
    // ERRORS
    // ============================================================

    recordError(room, message) {
        room.stats.errors++;

        this.broadcastToRoom(room.code, {
            type: 'OPERATIONAL_ERROR',
            message,
            errors: room.stats.errors
        });
    }

    // ============================================================
    // VICTORY / DEFEAT
    // ============================================================

    missionVictory(room) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;

        room.state = 'VICTORY';
        room.stats.endTime = Date.now();

        const timeSpent =
            180 - room.timeRemaining;

        const baseScore = 1000;
        const timeBonus =
            Math.max(0, room.timeRemaining * 2);

        const hintPenalty =
            room.stats.hintsUsed * 40;

        const errorPenalty =
            room.stats.errors * 25;

        const finalScore = Math.max(
            0,
            baseScore +
            timeBonus -
            hintPenalty -
            errorPenalty
        );

        this.broadcastToRoom(room.code, {
            type: 'MISSION_VICTORY',

            summary: {
                timeRemaining: room.timeRemaining,

                timeSpent:
                    `${Math.floor(timeSpent / 60)}:${(timeSpent % 60)
                        .toString()
                        .padStart(2, '0')}`,

                hintsUsed: room.stats.hintsUsed,

                errors: room.stats.errors,

                threatsNeutralized:
                    room.stats.threatsNeutralized + 1,

                score: finalScore
            }
        });
    }

    missionFailed(room, reason) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;

        room.state = 'DEFEAT';

        this.broadcastToRoom(room.code, {
            type: 'MISSION_FAILED',

            reason:
                reason === 'TIME_EXPIRED'
                    ? 'CRITICAL TIME EXPIRATION — STATION OFFLINE'
                    : 'STATION COMPROMISED'
        });
    }

    // ============================================================
    // RESET
    // ============================================================

    resetGame(ws) {
        const client = this.clients.get(ws);

        if (!client || !client.roomId) return;

        const room = this.rooms.get(client.roomId);

        if (!room) return;

        clearInterval(room.timerInterval);
        room.timerInterval = null;

        room.state = 'LOBBY';
        room.stage = 1;
        room.timeRemaining = 180;
        room.puzzles = null;

        room.stats = {
            hintsUsed: 0,
            errors: 0,
            threatsNeutralized: 0,
            startTime: 0,
            endTime: 0
        };

        room.stage3CurrentIndex = 0;

        room.bossState = {
            hp: 100,
            weakpoint: 'CENTER_CORE'
        };

        // Keep the selected roles, but require both players to ready up again.
        for (const socket of room.clients) {
            const info = this.clients.get(socket);

            if (info) {
                info.ready = false;
            }
        }

        this.broadcastToRoom(room.code, {
            type: 'GAME_RESET'
        });

        this.sendRoomState(room.code);
    }

    // ============================================================
    // DISCONNECT
    // ============================================================

    handleDisconnect(ws) {
        const client = this.clients.get(ws);

        if (!client) return;

        const roomCode = client.roomId;

        this.clients.delete(ws);

        if (!roomCode) return;

        const room = this.rooms.get(roomCode);

        if (!room) return;

        room.clients.delete(ws);

        if (room.clients.size === 0) {
            clearInterval(room.timerInterval);
            this.rooms.delete(roomCode);

            console.log(`[ROOM] ${roomCode} closed — empty room.`);
            return;
        }

        // If someone leaves during a mission, stop the current mission.
        if (room.state === 'RUNNING') {
            clearInterval(room.timerInterval);
            room.timerInterval = null;

            room.state = 'LOBBY';
            room.stage = 1;
            room.timeRemaining = 180;
            room.puzzles = null;

            room.stats = {
                hintsUsed: 0,
                errors: 0,
                threatsNeutralized: 0,
                startTime: 0,
                endTime: 0
            };

            room.stage3CurrentIndex = 0;

            room.bossState = {
                hp: 100,
                weakpoint: 'CENTER_CORE'
            };

            for (const socket of room.clients) {
                const info = this.clients.get(socket);

                if (info) {
                    info.ready = false;
                }
            }

            this.broadcastToRoom(roomCode, {
                type: 'OPERATOR_DISCONNECTED',
                message:
                    'CRITICAL: OPERATOR TERMINAL LINK LOST. Mission reset. A replacement operator may join this room.'
            });
        }

        this.sendRoomState(roomCode);
    }

    // ============================================================
    // COMMUNICATION HELPERS
    // ============================================================

    sendTo(ws, message) {
        if (
            ws &&
            ws.readyState === 1
        ) {
            ws.send(JSON.stringify(message));
        }
    }

    broadcastToRoom(roomCode, message) {
        const room = this.rooms.get(roomCode);

        if (!room) return;

        const payload = JSON.stringify(message);

        for (const ws of room.clients) {
            if (ws.readyState === 1) {
                ws.send(payload);
            }
        }
    }
}

module.exports = GameManager;