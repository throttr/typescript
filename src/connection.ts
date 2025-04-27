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
import { Request, Response, QueuedRequest } from "./types";
import { BuildRequest, ParseResponse } from "./protocol";

/**
 * Connection
 */
export class Connection {
    /**
     * Socket
     *
     * @private
     */
    private socket: Socket;

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
    private queue: QueuedRequest[] = [];

    /**
     * Busy
     *
     * @private
     */
    private busy: boolean = false;

    /**
     * Constructor
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
                resolve();
            });

            /* c8 ignore start */
            this.socket.once('error', (err) => {
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
    send(request: Request): Promise<Response> {
        const buffer = BuildRequest(request);

        return new Promise((resolve, reject) => {
            this.queue.push({ buffer, resolve, reject });
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

        const { buffer, resolve, reject } = this.queue.shift()!;
        this.busy = true;

        /* c8 ignore start */
        this.socket.once('error', (err) => {
            this.busy = false;
            reject(err);
            this.processQueue();
        });
        /* c8 ignore stop */

        this.socket.write(buffer, () => {
            const chunks: Buffer[] = [];
            let received = 0;

            const onData = (chunk: Buffer) => {

                chunks.push(chunk);

                received += chunk.length;

                if (received >= 13) {
                    this.socket.off('data', onData);
                    this.busy = false;
                    try {
                        const full = Buffer.concat(chunks);
                        const response = ParseResponse(full);
                        resolve(response);
                        /* c8 ignore start */
                    } catch (err) {
                        reject(err);
                    }
                    /* c8 ignore stop */
                    this.processQueue();
                }
            };

            this.socket.on('data', onData);
        });
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.socket.end();
    }
}
