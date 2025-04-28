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

import { Socket } from "net";
import { Request, FullResponse, SimpleResponse, QueuedRequest } from "./types";
import { BuildRequest, ParseResponse, GetExpectedResponseSize, GetExpectedResponseType } from "./protocol";

/**
 * Connection
 */
export class Connection {
    /**
     * Socket
     *
     * @private
     */
    private readonly socket: Socket;

    /**
     * Host
     *
     * @private
     */
    private readonly host: string;

    /**
     * Port
     *
     * @private
     */
    private readonly port: number;

    /**
     * Queue
     *
     * @private
     */
    private readonly queue: QueuedRequest[] = [];

    /**
     * Busy
     *
     * @private
     */
    private busy: boolean = false;

    /**
     * Current expected size
     *
     * @private
     */
    private expectedSize: number = 0;

    /**
     * Current expected type
     *
     * @private
     */
    private expectedType: 'full' | 'simple' = 'full';

    /**
     * Current queued request
     *
     * @private
     */
    private current?: QueuedRequest;

    /**
     * Constructor
     *
     * @param host
     * @param port
     */
    constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
        this.socket = new Socket();
    }

    /**
     * Connect
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.connect(this.port, this.host, () => {
                this.socket.on('data', (chunk) => this.handleData(chunk));
                this.socket.on('error', (err) => this.handleError(err));
                resolve();
            });

            /* c8 ignore start */
            this.socket.once('error', (err: Error) => {
                reject(err);
            });
            /* c8 ignore stop */
        });
    }

    /**
     * Send
     *
     * @param request
     */
    send(request: Request): Promise<FullResponse | SimpleResponse> {
        const buffer = BuildRequest(request);
        const expectedSize = GetExpectedResponseSize(request);
        const expectedType = GetExpectedResponseType(request);

        return new Promise((resolve, reject) => {
            this.queue.push({ buffer, resolve, reject, expectedSize, expectedType });
            this.processQueue();
        });
    }

    /**
     * Process queue
     *
     * @private
     */
    private processQueue() {
        if (this.busy || this.queue.length === 0) {
            return;
        }

        const next = this.queue.shift()!;
        this.current = next;
        this.busy = true;
        this.expectedSize = next.expectedSize;
        this.expectedType = next.expectedType;

        this.socket.write(next.buffer);
    }

    /**
     * Handle incoming data
     *
     * @param chunk
     * @private
     */
    private handleData(chunk: Buffer) {
        if (!this.current) {
            return;
        }

        const chunks: Buffer[] = [];
        let received = 0;

        chunks.push(chunk);
        received += chunk.length;

        if (received >= this.expectedSize) {
            try {
                const full = Buffer.concat(chunks);
                const response = ParseResponse(full, this.expectedType);
                this.current.resolve(response);
                /* c8 ignore start */
            } catch (err) {
                this.current.reject(err);
            }
            /* c8 ignore stop */

            this.current = undefined;
            this.busy = false;
            this.processQueue();
        }
    }

    /**
     * Handle error
     *
     * @param error
     * @private
     */
    private handleError(error: Error) {
        if (this.current) {
            this.current.reject(error);
            this.current = undefined;
        }

        this.busy = false;
        this.processQueue();
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.socket.removeAllListeners(); // limpieza total
        this.socket.end();
    }
}
