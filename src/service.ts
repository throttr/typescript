// Copyright (C) 2025 Ian Torres
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { Configuration, Request, RequestType, Response } from './types';
import { Connection } from './connection';

/**
 * Service
 */
export class Service {
    /**
     * Configuration
     *
     * @private
     */
    public readonly config: Configuration;

    /**
     * Connections
     *
     * @private
     */
    public readonly connections: Connection[] = [];

    /**
     * Round-robin index
     * @private
     */
    public round_robin_index: number = 0;

    /**
     * Constructor
     *
     * @param config
     */
    constructor(config: Configuration) {
        this.config = {
            max_connections: 1,
            connection_configuration: {
                on_wait_for_writable_socket_attempts: 3,
                on_wait_for_writable_socket_timeout_per_attempt: 1000,
            },
            ...config,
        };
    }

    /**
     * Connect
     */
    async connect() {
        /* c8 ignore next */
        const max_connections = this.config.max_connections ?? 1;
        for (let i = 0; i < max_connections; i++) {
            const conn = new Connection(this.config);
            await conn.connect();
            this.connections.push(conn);
        }
    }

    /**
     * Send
     *
     * @param request
     */
    async send(request: Request): Promise<Response | Response[]>;
    async send(request: Request[]): Promise<Response[]>;
    async send(request: Request | Request[]): Promise<any> {
        /* c8 ignore start */
        if (this.connections.length === 0) {
            throw new Error('No available connections.');
        }
        /* c8 ignore stop */

        if (
            !(request instanceof Array) &&
            (request.type === RequestType.Subscribe || request.type === RequestType.Unsubscribe)
        ) {
            const promises = [] as Response[];
            for (const item of this.connections) {
                if (request.type == RequestType.Subscribe) {
                    item.subscriptions.set(request.channel, request.callback);
                } else {
                    item.subscriptions.delete(request.channel);
                }
                const promise = (await item.send(request)) as Response;
                promises.push(promise);
            }
            return promises;
        } else {
            const connection = await this.getConnection();
            return connection.send(request);
        }
    }

    /**
     * Get connection
     *
     * @private
     */
    private async getConnection(): Promise<Connection> {
        for (let i = 0; i < this.connections.length; i++) { // NOSONAR
            const index = this.round_robin_index;
            this.round_robin_index = (this.round_robin_index + 1) % this.connections.length;
            const conn = this.connections[index];
            /* c8 ignore start */
            if (!conn.isAlive()) {
                try {
                    await conn.reconnect();
                } catch {
                    continue;
                }
            }
            /* c8 ignore stop */
            if (conn.isAlive()) return conn;
            /* c8 ignore start */
        }
        throw new Error('No available connections (all dead)');
        /* c8 ignore stop */
    }

    /**
     * Disconnect
     */
    async disconnect() {
        for (const conn of this.connections) {
            await conn.disconnect();
        }
    }
}
