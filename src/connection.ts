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
import { Request, FullResponse, SimpleResponse, QueuedRequest, ValueSize } from './types';
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
    send(
        request: Request | Request[]
    ): Promise<FullResponse | SimpleResponse | (FullResponse | SimpleResponse)[]> {
        const requests = Array.isArray(request) ? request : [request];
        const buffers = requests.map(req => BuildRequest(req, this.value_size));
        const expectedTypes = requests.map(req => GetExpectedResponseType(req));

        return new Promise((resolve, reject) => {
            const responses: (FullResponse | SimpleResponse)[] = [];
            let remaining = requests.length;
            let failed = false;

            buffers.forEach((buffer, index) => {
                this.queue.push({
                    buffer: buffer,
                    expectedType: expectedTypes[index],
                    resolve: (res: FullResponse | SimpleResponse) => {
                        if (failed) return;
                        responses[index] = res;
                        remaining--;
                        if (remaining === 0) {
                            resolve(Array.isArray(request) ? responses : responses[0]);
                        }
                    },
                    reject: (err: Error) => {
                        if (!failed) {
                            failed = true;
                            reject(err);
                        }
                    },
                });
            });

            this.socket.write(Buffer.concat(buffers));
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

        while (this.queue.length > 0 && offset < iterationBuffer.length) {
            const current = this.queue[0];
            const type = current.expectedType;

            if (offset >= iterationBuffer.length) break;

            const firstByte = iterationBuffer.readUInt8(offset);
            offset++;

            const processed = this.tryHandleResponse(
                type,
                current,
                iterationBuffer,
                firstByte,
                offset
            );
            /* c8 ignore next */
            if (!processed) break;

            offset = processed.offset;
            this.queue.shift();
        }

        this.buffer = iterationBuffer.subarray(offset);
    }

    /**
     * Try handle response
     *
     * @param type
     * @param current
     * @param buffer
     * @param firstByte
     * @param offset
     * @private
     */
    private tryHandleResponse(
        type: 'simple' | 'full',
        current: QueuedRequest,
        buffer: Buffer,
        firstByte: number,
        offset: number
    ): { offset: number } | false {
        if (type === 'simple') {
            const slice = buffer.subarray(offset - 1, offset);
            return this.tryParse(slice, type, current, offset);
        }

        if (type === 'full') {
            if (firstByte === 0x00) {
                const slice = buffer.subarray(offset - 1, offset);
                return this.tryParse(slice, type, current, offset);
            }

            const expectedLength = this.value_size * 2 + 2;
            /* c8 ignore next */
            if (buffer.length < offset - 1 + expectedLength) return false;

            const slice = buffer.subarray(offset - 1, offset - 1 + expectedLength);
            return this.tryParse(slice, type, current, offset - 1 + expectedLength);
            /* c8 ignore start */
        }

        return false;
        /* c8 ignore stop */
    }

    /**
     * Try parse
     *
     * @param slice
     * @param type
     * @param current
     * @param nextOffset
     * @private
     */
    private tryParse(
        slice: Buffer,
        type: 'simple' | 'full',
        current: QueuedRequest,
        nextOffset: number
    ): { offset: number } {
        try {
            const response = ParseResponse(slice, type, this.value_size);
            current.resolve(response);
            /* c8 ignore start */
        } catch (e) {
            current.reject(e);
        }
        /* c8 ignore stop */
        return { offset: nextOffset };
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
