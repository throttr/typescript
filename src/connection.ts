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
import {Request, FullResponse, SimpleResponse, QueuedRequest, ValueSize, RequestType} from './types';
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

    private pendingChunks: Buffer[] = [];
    private processing = false;

    /**
     * Bytes vistos por nosotros
     */
    private bytesSeen: number = 0;


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
    }

    /**
     * Connect
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.on('data', (chunk) => this.onData(chunk));
            this.socket.on('error', (error) => this.onError(error));

            /* c8 ignore start */
            this.socket.once('error', (err: Error) => {
                console.error("Something went wrong", err);
                reject(err);
            });
            /* c8 ignore stop */

            this.socket.connect(this.port, this.host, () => {
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
            console.log("Request:", request);
            console.log("Request Type:", RequestType[request.type]);
            console.log("We write: ", buffer.toString('hex'))
            const response = this.socket.write(buffer)
            console.log("Write response:", response);
        });
    }

    /**
     * Handle incoming data
     *
     * @param chunk
     * @private
     */
    private onData(chunk: Buffer) {
        const totalRead = this.socket.bytesRead;
        const expectedChunkLength = totalRead - this.bytesSeen;

        console.log("Seen", this.bytesSeen);
        console.log("READED:", this.socket.bytesRead, "CHUNK LENGTH:", chunk.length);

        if (expectedChunkLength < 0) {
            console.warn(`[CI WARN] Detected bytesRead rollback or inconsistency. Resetting counters.`);
            this.bytesSeen = totalRead;
            return;
        }

        let effectiveChunk = chunk;
        if (chunk.length > expectedChunkLength) {
            console.warn(`[CI WARN] Chunk larger than expected. Trimming to ${expectedChunkLength} bytes`);
            effectiveChunk = chunk.subarray(0, expectedChunkLength);
        }

        this.bytesSeen += effectiveChunk.length;

        console.log("Received (sanitized):", effectiveChunk);
        this.pendingChunks.push(effectiveChunk);
        this.tryProcess();
    }

    private tryProcess() {
        console.log("Try processing");
        if (this.processing) {
            console.log("Another is processing...");
            return;
        }
        console.log("Processing flag turn on")
        this.processing = true;

        if (this.pendingChunks.length == 0) {
            console.log("Chunks empty ...")
        }

        while (this.pendingChunks.length > 0) {
            const chunk = this.pendingChunks.shift()!;
            console.log("Processing Chunk:", chunk);
            this.processPendingResponses(chunk);
        }

        console.log("Flag is turning down");
        this.processing = false;
    }

    /**
     * Process pending responses
     *
     * @private
     */
    private processPendingResponses(chunk: Buffer) {
        console.log(`[CI DEBUG] >>> processPendingResponses called`);
        console.log(`[CI DEBUG] incoming chunk=${chunk.toString('hex')}`);
        console.log(`[CI DEBUG] stored buffer=${this.buffer.toString('hex')}`);

        const iterationBuffer = Buffer.concat([this.buffer, chunk]);
        console.log(`[CI DEBUG] merged iterationBuffer=${iterationBuffer.toString('hex')}`);

        let offset = 0;

        while (this.queue.length > 0) {
            const current = this.queue[0];
            const type = current.expectedType;

            console.log(`[CI DEBUG] processing queue[0] type=${type} queueLength=${this.queue.length} offset=${offset}`);

            if (iterationBuffer.length <= offset) {
                console.log(`[CI DEBUG] breaking: iterationBuffer.length=${iterationBuffer.length} <= offset=${offset}`);
                break;
            }

            const firstByte = iterationBuffer.readUInt8(offset);
            console.log(`[CI DEBUG] firstByte=0x${firstByte.toString(16).padStart(2, '0')} at offset=${offset}`);
            offset++;

            if (type === 'simple') {
                const slice = iterationBuffer.subarray(offset - 1, offset);
                console.log(`[CI DEBUG] simple slice=${slice.toString('hex')}`);
                try {
                    const response = ParseResponse(slice, type, this.value_size);
                    current.resolve(response);
                    console.log(`[CI DEBUG] simple resolved`);
                } catch (e) {
                    console.error(`[CI ERROR] simple parse error=${(e as Error).message}`);
                    current.reject(e);
                }
                this.queue.shift();
                continue;
            }

            if (type === 'full') {
                if (firstByte === 0x00) {
                    const slice = iterationBuffer.subarray(offset - 1, offset);
                    console.log(`[CI DEBUG] full slice (short)=${slice.toString('hex')}`);
                    try {
                        const response = ParseResponse(slice, type, this.value_size);
                        current.resolve(response);
                        console.log(`[CI DEBUG] full resolved (short)`);
                    } catch (e) {
                        console.error(`[CI ERROR] full parse error (short)=${(e as Error).message}`);
                        current.reject(e);
                    }
                    this.queue.shift();
                    continue;
                }

                const expectedLength = this.value_size * 2 + 2;
                console.log(`[CI DEBUG] expectedLength (full)=${expectedLength}`);

                if (iterationBuffer.length < offset - 1 + expectedLength) {
                    console.log(`[CI DEBUG] not enough data yet for full response: have=${iterationBuffer.length - (offset - 1)}, need=${expectedLength}`);
                    break;
                }

                const slice = iterationBuffer.subarray(offset - 1, offset - 1 + expectedLength);
                console.log(`[CI DEBUG] full slice=${slice.toString('hex')}`);
                try {
                    const response = ParseResponse(slice, type, this.value_size);
                    current.resolve(response);
                    console.log(`[CI DEBUG] full resolved`);
                } catch (e) {
                    console.error(`[CI ERROR] full parse error=${(e as Error).message}`);
                    current.reject(e);
                }
                offset += expectedLength;
                this.queue.shift();
                continue;
            }

            console.log(`[CI DEBUG] unknown response type, breaking`);
            break;
        }

        const remaining = iterationBuffer.subarray(offset);
        this.buffer = remaining;
        console.log(`[CI DEBUG] remaining buffer=${remaining.toString('hex')}`);
    }

    /**
     * Handle error
     *
     * @param error
     * @private
     */
    private onError(error: Error) {
        console.log("onError:", error);
        if (this.queue.length > 0) {
            const current = this.queue.shift()!;
            current.reject(error);
        }
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.socket.removeAllListeners();
        this.socket.end();
    }
}
