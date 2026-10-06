class NetworkConnection {
    constructor(onMessageCallback) {
        this.onMessageCallback = onMessageCallback;

        this.ws = null;
        this.reconnectTimer = null;
        this.intentionalClose = false;

        this.connect();
    }

    connect() {
        if (
            this.ws &&
            (
                this.ws.readyState === WebSocket.OPEN ||
                this.ws.readyState === WebSocket.CONNECTING
            )
        ) {
            return;
        }

        const protocol =
            window.location.protocol === 'https:'
                ? 'wss:'
                : 'ws:';

        const wsUrl =
            `${protocol}//${window.location.host}`;

        try {
            this.ws = new WebSocket(wsUrl);
        } catch (err) {
            console.error('[NET] WebSocket creation failed:', err);
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            console.log(
                '[NET] Connected to AEGIS-7 Core Authoritative Engine'
            );

            this.onMessageCallback({
                type: 'CONNECTION_STATUS',
                connected: true
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const packet = JSON.parse(event.data);

                this.onMessageCallback(packet);
            } catch (err) {
                console.error(
                    '[NET] Failed to parse server message:',
                    err
                );
            }
        };

        this.ws.onerror = (err) => {
            console.warn('[NET] WebSocket error:', err);

            this.onMessageCallback({
                type: 'CONNECTION_STATUS',
                connected: false
            });
        };

        this.ws.onclose = () => {
            console.warn(
                '[NET] Connection severed.'
            );

            this.onMessageCallback({
                type: 'CONNECTION_STATUS',
                connected: false
            });

            if (!this.intentionalClose) {
                this.scheduleReconnect();
            }
        };
    }

    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 2000);
    }

    send(packet) {
        if (
            this.ws &&
            this.ws.readyState === WebSocket.OPEN
        ) {
            this.ws.send(JSON.stringify(packet));
            return true;
        }

        console.warn(
            '[NET] Cannot send packet — socket is not connected.'
        );

        return false;
    }

    close() {
        this.intentionalClose = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
        }
    }
}