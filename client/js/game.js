class GameController {
    constructor() {
        this.net = new NetworkConnection(
            (packet) => this.handleServerPacket(packet)
        );

        this.role = null;
        this.stage = 1;
        this.puzzles = null;
        this.bossEngine = null;

        this.roomCode = null;
        this.inRoom = false;

        this.bindDOM();
    }

    // ============================================================
    // DOM EVENTS
    // ============================================================

    bindDOM() {
        document.getElementById('btn-splash-start').onclick = () => {
            soundFX.init();
            soundFX.playBeep(440, 'sine', 0.1);

            this.switchScreen('screen-lobby');
        };

        document.getElementById('btn-create-room').onclick = () => {
            soundFX.init();
            soundFX.playBeep(520, 'sine', 0.1);

            this.net.send({
                type: 'CREATE_ROOM'
            });
        };

        document.getElementById('btn-join-room').onclick = () => {
            soundFX.init();
            soundFX.playBeep(520, 'sine', 0.1);

            const input =
                document.getElementById('room-code-input');

            const roomCode =
                input.value.trim().toUpperCase();

            if (!roomCode) {
                this.showLobbyMessage(
                    'ENTER A FOUR-CHARACTER MISSION CODE.',
                    'error'
                );
                return;
            }

            this.net.send({
                type: 'JOIN_ROOM',
                roomCode
            });
        };

        document.getElementById('room-code-input').addEventListener(
            'keydown',
            (event) => {
                if (event.key === 'Enter') {
                    document.getElementById('btn-join-room').click();
                }
            }
        );

        document.getElementById('btn-select-systems').onclick = () => {
            this.net.send({
                type: 'SELECT_ROLE',
                role: 'SYSTEMS_OPERATOR'
            });

            soundFX.playBeep(520, 'sine', 0.1);
        };

        document.getElementById('btn-select-cyber').onclick = () => {
            this.net.send({
                type: 'SELECT_ROLE',
                role: 'CYBER_ANALYST'
            });

            soundFX.playBeep(520, 'sine', 0.1);
        };

        document.getElementById('btn-toggle-ready').onclick = () => {
            this.net.send({
                type: 'READY_TOGGLE'
            });

            soundFX.playSuccess();
        };

        document.getElementById('btn-hint').onclick = () => {
            this.net.send({
                type: 'REQUEST_HINT',
                stage: this.stage
            });
        };

        document.getElementById('btn-close-hint').onclick = () => {
            document
                .getElementById('modal-hint')
                .classList.add('hidden');
        };

        document.getElementById('btn-audio').onclick = (event) => {
            const on = soundFX.toggleMute();

            event.target.innerText =
                on ? 'AUDIO: ON' : 'AUDIO: OFF';
        };

        document.getElementById('btn-replay').onclick = () => {
            this.net.send({
                type: 'RESET_GAME'
            });
        };
    }

    // ============================================================
    // SCREEN MANAGEMENT
    // ============================================================

    switchScreen(screenId) {
        document
            .querySelectorAll(
                '.screen-view, #screen-splash'
            )
            .forEach((screen) => {
                screen.classList.remove('active-screen');
            });

        const target =
            document.getElementById(screenId);

        if (target) {
            target.classList.add('active-screen');
        }
    }

    // ============================================================
    // SERVER PACKETS
    // ============================================================

    handleServerPacket(packet) {
        switch (packet.type) {
            case 'CONNECTION_STATUS':
                this.handleConnectionStatus(packet);
                break;

            case 'CONNECTION_INIT':
                break;

            case 'ROOM_CREATED':
                this.handleRoomJoined(packet.roomCode, true);
                break;

            case 'ROOM_JOINED':
                this.handleRoomJoined(packet.roomCode, false);
                break;

            case 'ROOM_ERROR':
                this.showLobbyMessage(
                    packet.message,
                    'error'
                );
                break;

            case 'SERVER_ERROR':
                this.showLobbyMessage(
                    packet.message,
                    'error'
                );
                break;

            case 'ROLE_CONFIRMED':
                this.role = packet.role;

                document.getElementById(
                    'role-badge'
                ).innerText =
                    packet.role.replace('_', ' ');

                document
                    .getElementById('btn-toggle-ready')
                    .removeAttribute('disabled');

                this.updateRoleButtons();

                break;

            case 'ROLE_ERROR':
                this.showLobbyMessage(
                    packet.message,
                    'error'
                );

                break;

            case 'LOBBY_UPDATE':
                this.updateLobbyView(packet.data);
                break;

            case 'MISSION_START':
                this.stage = packet.stage;
                this.puzzles = packet.puzzles;

                this.startMissionView();

                break;

            case 'TIMER_TICK':
                this.updateTimer(
                    packet.timeRemaining
                );

                break;

            case 'HINT_DELIVERED':
                this.showHint(
                    packet.hint,
                    packet.totalHintsUsed
                );

                break;

            case 'STAGE_CLEARED':
                this.handleStageCleared(packet);
                break;

            case 'STAGE3_STEP_SUCCESS':
                soundFX.playSuccess();

                if (
                    this.role === 'SYSTEMS_OPERATOR'
                ) {
                    SystemsOperatorUI.updateStage3Step(
                        packet.stepIndex,
                        packet.totalSteps
                    );
                }

                break;

            case 'STAGE3_RESET':
                soundFX.playError();
                break;

            case 'BOSS_HIT':
                soundFX.playLaser();

                document.getElementById(
                    'boss-hp-fill'
                ).style.width =
                    `${packet.hp}%`;

                if (this.bossEngine) {
                    this.bossEngine.setWeakpoint(
                        packet.newWeakpoint
                    );
                }

                if (
                    this.role === 'CYBER_ANALYST'
                ) {
                    CyberAnalystUI.updateWeakpoint(
                        packet.newWeakpoint
                    );
                }

                break;

            case 'OPERATIONAL_ERROR':
                soundFX.playError();

                this.showFlashNotification(
                    packet.message,
                    'error'
                );

                break;

            case 'OPERATOR_DISCONNECTED':
                this.showFlashNotification(
                    packet.message,
                    'warning'
                );

                break;

            case 'MISSION_VICTORY':
                soundFX.playSuccess();

                this.showEndScreen(
                    true,
                    packet.summary
                );

                break;

            case 'MISSION_FAILED':
                soundFX.playError();

                this.showEndScreen(
                    false,
                    {
                        reason: packet.reason
                    }
                );

                break;

            case 'GAME_RESET':
                this.handleGameReset();
                break;
        }
    }

    // ============================================================
    // CONNECTION
    // ============================================================

    handleConnectionStatus(packet) {
        const indicator =
            document.getElementById(
                'connection-status'
            );

        if (!indicator) return;

        if (packet.connected) {
            indicator.innerText = 'ONLINE';
            indicator.style.color =
                'var(--accent-green)';
        } else {
            indicator.innerText =
                'RECONNECTING...';

            indicator.style.color =
                'var(--accent-red)';
        }
    }

    // ============================================================
    // ROOM
    // ============================================================

    handleRoomJoined(roomCode, created) {
        this.roomCode = roomCode;
        this.inRoom = true;

        document.getElementById(
            'display-room-code'
        ).innerText = roomCode;

        document.getElementById(
            'room-entry-panel'
        ).style.display = 'none';

        document.getElementById(
            'role-selection-area'
        ).style.display = 'block';

        document.getElementById(
            'room-code-input'
        ).value = '';

        this.showLobbyMessage(
            created
                ? 'MISSION ROOM CREATED. SEND THE CODE TO YOUR PARTNER.'
                : 'CONNECTED TO MISSION ROOM.',
            'success'
        );
    }

    // ============================================================
    // LOBBY
    // ============================================================

    updateLobbyView(data) {
        if (data.roomCode) {
            this.roomCode = data.roomCode;

            const roomDisplay =
                document.getElementById(
                    'display-room-code'
                );

            if (roomDisplay) {
                roomDisplay.innerText =
                    data.roomCode;
            }
        }

        const sysStat =
            document.getElementById(
                'status-systems'
            );

        const cyberStat =
            document.getElementById(
                'status-cyber'
            );

        sysStat.innerText =
            data.systemsOperator
                ? (
                    data.systemsReady
                        ? 'READY ✓'
                        : 'CONNECTED (CHOOSING)'
                )
                : 'WAITING FOR OPERATOR...';

        sysStat.style.color =
            data.systemsReady
                ? 'var(--accent-green)'
                : 'var(--text-muted)';

        cyberStat.innerText =
            data.cyberAnalyst
                ? (
                    data.cyberReady
                        ? 'READY ✓'
                        : 'CONNECTED (CHOOSING)'
                )
                : 'WAITING FOR OPERATOR...';

        cyberStat.style.color =
            data.cyberReady
                ? 'var(--accent-green)'
                : 'var(--text-muted)';

        const playerCount =
            document.getElementById(
                'player-count'
            );

        if (playerCount) {
            playerCount.innerText =
                `${data.playerCount || 0}/2 OPERATORS CONNECTED`;
        }

        this.updateRoleButtons();

        const readyButton =
            document.getElementById(
                'btn-toggle-ready'
            );

        if (this.role) {
            readyButton.removeAttribute(
                'disabled'
            );

            const ownReady =
                this.role === 'SYSTEMS_OPERATOR'
                    ? data.systemsReady
                    : data.cyberReady;

            readyButton.innerText =
                ownReady
                    ? 'CANCEL READINESS'
                    : 'CONFIRM READINESS';
        } else {
            readyButton.setAttribute(
                'disabled',
                'disabled'
            );
        }

        const lobbyMessage =
            document.getElementById(
                'lobby-message'
            );

        if (data.canStart) {
            lobbyMessage.innerText =
                'BOTH OPERATORS READY — MISSION STARTING...';
        } else if (data.playerCount < 2) {
            lobbyMessage.innerText =
                'WAITING FOR THE SECOND OPERATOR...';
        } else if (!data.systemsOperator) {
            lobbyMessage.innerText =
                'SYSTEMS OPERATOR ROLE AVAILABLE.';
        } else if (!data.cyberAnalyst) {
            lobbyMessage.innerText =
                'CYBER ANALYST ROLE AVAILABLE.';
        } else {
            lobbyMessage.innerText =
                'BOTH OPERATORS MUST CONFIRM READINESS.';
        }
    }

    updateRoleButtons() {
        if (!this.inRoom) return;

        const systemsButton =
            document.getElementById(
                'btn-select-systems'
            );

        const cyberButton =
            document.getElementById(
                'btn-select-cyber'
            );

        if (this.role === 'SYSTEMS_OPERATOR') {
            systemsButton.innerText =
                'ROLE SELECTED ✓';

            cyberButton.innerText =
                'ASSIGN ROLE';

            systemsButton.disabled = true;
            cyberButton.disabled = false;

            return;
        }

        if (this.role === 'CYBER_ANALYST') {
            cyberButton.innerText =
                'ROLE SELECTED ✓';

            systemsButton.innerText =
                'ASSIGN ROLE';

            cyberButton.disabled = true;
            systemsButton.disabled = false;

            return;
        }

        systemsButton.disabled = false;
        cyberButton.disabled = false;

        systemsButton.innerText =
            'ASSIGN ROLE';

        cyberButton.innerText =
            'ASSIGN ROLE';
    }

    showLobbyMessage(message, type = 'normal') {
        const element =
            document.getElementById(
                'lobby-message'
            );

        if (!element) return;

        element.innerText = message;

        if (type === 'error') {
            element.style.color =
                'var(--accent-red)';
        } else if (type === 'success') {
            element.style.color =
                'var(--accent-green)';
        } else {
            element.style.color =
                'var(--text-muted)';
        }
    }

    // ============================================================
    // GAME START
    // ============================================================

    startMissionView() {
        this.switchScreen(
            'screen-game'
        );

        document.getElementById(
            'global-hud'
        ).classList.remove('hidden');

        if (
            this.role === 'SYSTEMS_OPERATOR'
        ) {
            document.getElementById(
                'systems-operator-view'
            ).classList.remove('hidden');

            document.getElementById(
                'cyber-analyst-view'
            ).classList.add('hidden');

            SystemsOperatorUI.renderStage1(
                this.puzzles.stage1
            );
        } else {
            document.getElementById(
                'cyber-analyst-view'
            ).classList.remove('hidden');

            document.getElementById(
                'systems-operator-view'
            ).classList.add('hidden');

            CyberAnalystUI.renderStage1(
                this.puzzles.stage1
            );
        }

        this.updateTimer(180);
    }

    // ============================================================
    // STAGES
    // ============================================================

    handleStageCleared(packet) {
        soundFX.playSuccess();

        this.stage =
            packet.nextStage;

        this.showFlashNotification(
            packet.message,
            'success'
        );

        if (this.stage === 2) {
            if (
                this.role === 'SYSTEMS_OPERATOR'
            ) {
                SystemsOperatorUI.renderStage2(
                    this.puzzles.stage2
                );
            }

            if (
                this.role === 'CYBER_ANALYST'
            ) {
                CyberAnalystUI.renderStage2(
                    this.puzzles.stage2
                );
            }
        }

        else if (this.stage === 3) {
            if (
                this.role === 'SYSTEMS_OPERATOR'
            ) {
                SystemsOperatorUI.renderStage3(
                    this.puzzles.stage3
                );
            }

            if (
                this.role === 'CYBER_ANALYST'
            ) {
                CyberAnalystUI.renderStage3(
                    this.puzzles.stage3
                );
            }
        }

        else if (this.stage === 4) {
            document
                .getElementById(
                    'boss-battle-layer'
                )
                .classList.remove('hidden');

            this.bossEngine =
                new BossCombatEngine(
                    'bossCombatCanvas'
                );

            this.bossEngine.start();

            this.bossEngine.setWeakpoint(
                this.puzzles.finalBoss.initialWeakpoint
            );

            if (
                this.role === 'SYSTEMS_OPERATOR'
            ) {
                SystemsOperatorUI.renderBossCombat();
            }

            if (
                this.role === 'CYBER_ANALYST'
            ) {
                CyberAnalystUI.renderBossCombat(
                    this.puzzles.finalBoss
                );
            }
        }
    }

    // ============================================================
    // TIMER
    // ============================================================

    updateTimer(seconds) {
        const mins =
            Math.floor(seconds / 60);

        const secs =
            seconds % 60;

        const element =
            document.getElementById(
                'mission-timer'
            );

        element.innerText =
            `${mins
                .toString()
                .padStart(2, '0')}:${secs
                    .toString()
                    .padStart(2, '0')}`;

        if (seconds <= 30) {
            element.className =
                'timer critical';
        }

        else if (seconds <= 60) {
            element.className =
                'timer warning';
        }

        else {
            element.className =
                'timer';
        }
    }

    // ============================================================
    // HINTS
    // ============================================================

    showHint(hintText, total) {
        document.getElementById(
            'hint-count'
        ).innerText = total;

        document.getElementById(
            'hint-text'
        ).innerText = hintText;

        document.getElementById(
            'modal-hint'
        ).classList.remove('hidden');
    }

    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    showFlashNotification(msg, type) {
        const banner =
            document.createElement('div');

        banner.style.position = 'fixed';
        banner.style.top = '70px';
        banner.style.left = '50%';
        banner.style.transform =
            'translateX(-50%)';
        banner.style.padding =
            '12px 24px';
        banner.style.borderRadius =
            '4px';
        banner.style.fontFamily =
            'var(--font-mono)';
        banner.style.fontSize =
            '0.9rem';
        banner.style.zIndex = '300';
        banner.style.boxShadow =
            '0 4px 16px rgba(0,0,0,0.5)';
        banner.style.maxWidth =
            '90vw';
        banner.style.textAlign =
            'center';

        if (type === 'error') {
            banner.style.background =
                '#ff3366';

            banner.style.color =
                '#fff';
        }

        else if (type === 'warning') {
            banner.style.background =
                '#ffb300';

            banner.style.color =
                '#000';
        }

        else {
            banner.style.background =
                '#00e676';

            banner.style.color =
                '#000';
        }

        banner.innerText = msg;

        document.body.appendChild(
            banner
        );

        setTimeout(() => {
            banner.remove();
        }, 3500);
    }

    // ============================================================
    // ACTIONS
    // ============================================================

    sendSystemAction(
        action,
        payload = {}
    ) {
        this.net.send({
            type: 'SYSTEM_ACTION',
            action,
            payload
        });
    }

    fireBossAttack(targetCore) {
        this.net.send({
            type: 'BOSS_ATTACK',
            targetCore
        });
    }

    // ============================================================
    // END SCREEN
    // ============================================================

    showEndScreen(
        victory,
        stats
    ) {
        document.getElementById(
            'global-hud'
        ).classList.add('hidden');

        this.switchScreen(
            'screen-end'
        );

        const title =
            document.getElementById(
                'end-title'
            );

        const sub =
            document.getElementById(
                'end-subtitle'
            );

        if (victory) {
            title.innerText =
                'AEGIS-7 SECURED';

            title.style.color =
                'var(--accent-cyan)';

            sub.innerText =
                'MISSION COMPLETE';

            document.getElementById(
                'stat-time'
            ).innerText =
                stats.timeSpent;

            document.getElementById(
                'stat-hints'
            ).innerText =
                stats.hintsUsed;

            document.getElementById(
                'stat-errors'
            ).innerText =
                stats.errors;

            document.getElementById(
                'stat-threats'
            ).innerText =
                stats.threatsNeutralized;

            document.getElementById(
                'stat-score'
            ).innerText =
                stats.score;
        }

        else {
            title.innerText =
                'MISSION FAILED';

            title.style.color =
                'var(--accent-red)';

            sub.innerText =
                stats.reason;

            document.getElementById(
                'stat-time'
            ).innerText =
                '03:00';

            document.getElementById(
                'stat-hints'
            ).innerText =
                '-';

            document.getElementById(
                'stat-errors'
            ).innerText =
                '-';

            document.getElementById(
                'stat-threats'
            ).innerText =
                '-';

            document.getElementById(
                'stat-score'
            ).innerText =
                '0';
        }
    }

    // ============================================================
    // RESET
    // ============================================================

    handleGameReset() {
        if (this.bossEngine) {
            this.bossEngine.stop();
            this.bossEngine = null;
        }

        this.stage = 1;
        this.puzzles = null;

        document.getElementById(
            'global-hud'
        ).classList.add('hidden');

        document.getElementById(
            'boss-battle-layer'
        ).classList.add('hidden');

        document.getElementById(
            'systems-operator-view'
        ).classList.add('hidden');

        document.getElementById(
            'cyber-analyst-view'
        ).classList.add('hidden');

        // IMPORTANT:
        // Keep the room and role.
        // The server keeps the two roles assigned,
        // but both players must ready up again.

        this.switchScreen(
            'screen-lobby'
        );

        this.updateRoleButtons();

        this.showLobbyMessage(
            'MISSION RESET. BOTH OPERATORS MUST CONFIRM READINESS AGAIN.',
            'success'
        );
    }
}

window.Game =
    new GameController();