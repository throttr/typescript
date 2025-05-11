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

import { Configuration, Request, Response } from './types';
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
    private readonly config: Configuration;

    /**
     * Connections
     *
     * @private
     */
    private readonly connections: Connection[] = [];

    /**
     * Round-robin index
     * @private
     */
    private round_robin_index: number = 0;

    /**
     * Constructor
     *
     * @param config
     */
    constructor(config: Configuration) {
        this.config = {
            max_connections: 1,
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
            const conn = new Connection(this.config.host, this.config.port, this.config.value_size);
            await conn.connect();
            this.connections.push(conn);
        }
    }

    /**
     * Send
     *
     * @param request
     */
    async send(request: Request): Promise<Response>;
    async send(request: Request[]): Promise<Response[]>;
    async send(request: Request | Request[]): Promise<any> {
        /* c8 ignore start */
        if (this.connections.length === 0) {
            throw new Error('No available connections.');
        }
        /* c8 ignore stop */
        return this.getConnection().send(request);
    }

    /**
     * Get connection
     *
     * @private
     */
    private getConnection(): Connection {
        const conn = this.connections[this.round_robin_index];
        this.round_robin_index = (this.round_robin_index + 1) % this.connections.length;
        return conn;
    }

    /**
     * Disconnect
     */
    disconnect() {
        for (const conn of this.connections) {
            conn.disconnect();
        }
    }
}
