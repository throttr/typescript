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

import { Socket } from 'net';
import {
    Request,
    FullResponse,
    SimpleResponse,
    QueuedRequest,
    ValueSize,
} from './types';
import { BuildRequest, ParseResponse, GetExpectedResponseType } from './protocol';

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
     * Value size
     *
     * @private
     */
    private readonly value_size: ValueSize;

    /**
     * Queue
     *
     * @private
     */
    private readonly queue: QueuedRequest[] = [];

    /**
     * Buffer
     *
     * @private
     */
    private buffer: Buffer = Buffer.alloc(0);

    /**
     * Constructor
     *
     * @param host
     * @param port
     * @param value_size
     */
    constructor(host: string, port: number, value_size: ValueSize) {
        this.host = host;
        this.port = port;
        this.value_size = value_size;
        this.socket = new Socket();
        this.socket.setNoDelay(true);
    }

    /**
     * Connect
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            /* c8 ignore start */
            this.socket.once('error', (err: Error) => {
                reject(err);
            });
            /* c8 ignore stop */

            this.socket.connect(this.port, this.host, () => {
                this.socket.on('data', chunk => this.onData(chunk));
                this.socket.on('error', error => this.onError(error));

                resolve();
            });
        });
    }

    /**
     * Send
     *
     * @param request
     */
    send(request: Request): Promise<FullResponse | SimpleResponse> {
        const buffer = BuildRequest(request, this.value_size);
        const expectedType = GetExpectedResponseType(request);

        return new Promise((resolve, reject) => {
            this.queue.push({
                buffer: buffer,
                resolve: resolve,
                reject: reject,
                expectedType: expectedType,
            });
            this.socket.write(buffer);
        });
    }

    /**
     * Handle incoming data
     *
     * @param chunk
     * @private
     */
    private onData(chunk: Buffer) {
        setImmediate(() => this.processPendingResponses(chunk));
    }

    /**
     * Process pending responses
     *
     * @private
     */
    private processPendingResponses(chunk: Buffer) {
        const iterationBuffer = Buffer.concat([this.buffer, chunk]);

        let offset = 0;

        while (this.queue.length > 0) {
            const current = this.queue[0];
            const type = current.expectedType;

            /* c8 ignore start */
            if (iterationBuffer.length <= offset) {
                break;
            }
            /* c8 ignore stop */

            const firstByte = iterationBuffer.readUInt8(offset);
            offset++;

            if (type === 'simple') {
                const slice = iterationBuffer.subarray(offset - 1, offset);
                try {
                    const response = ParseResponse(slice, type, this.value_size);
                    current.resolve(response);
                    /* c8 ignore start */
                } catch (e) {
                    current.reject(e);
                }
                /* c8 ignore stop */
                this.queue.shift();
                continue;
            }

            if (type === 'full') {
                if (firstByte === 0x00) {
                    const slice = iterationBuffer.subarray(offset - 1, offset);
                    try {
                        const response = ParseResponse(slice, type, this.value_size);
                        current.resolve(response);
                        /* c8 ignore start */
                    } catch (e) {
                        current.reject(e);
                    }
                    /* c8 ignore stop */
                    this.queue.shift();
                    continue;
                }

                const expectedLength = this.value_size * 2 + 2;

                /* c8 ignore start */
                if (iterationBuffer.length < offset - 1 + expectedLength) break;
                /* c8 ignore stop */

                const slice = iterationBuffer.subarray(offset - 1, offset - 1 + expectedLength);

                try {
                    const response = ParseResponse(slice, type, this.value_size);
                    current.resolve(response);
                    /* c8 ignore start */
                } catch (e) {
                    current.reject(e);
                }
                /* c8 ignore stop */

                offset += expectedLength;
                this.queue.shift();
                continue;
                /* c8 ignore start */
            }

            break;
        }
        /* c8 ignore stop */

        this.buffer = iterationBuffer.subarray(offset);
    }

    /**
     * Handle error
     *
     * @param error
     * @private
     */
    /* c8 ignore start */
    private onError(error: Error) {
        if (this.queue.length > 0) {
            const current = this.queue.shift()!;
            current.reject(error);
        }
    }
    /* c8 ignore stop */

    /**
     * Disconnect
     */
    disconnect() {
        this.socket.removeAllListeners();
        this.socket.end();
    }
}
