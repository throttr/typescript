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
import { Request, Response, ResponseType, QueuedRequest, Configuration, ValueSize } from './types';
import { BuildRequest, ParseResponse, GetExpectedResponseType } from './protocol';
import { read } from './utils';

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
     * Alive
     *
     * @private
     */
    private alive: boolean = false;

    /**
     * Wait for writable socket attempts
     *
     * @private
     */
    private wait_for_writable_socket_attempts: number = 0;

    /**
     * Configuration
     *
     * @private
     */
    private readonly config: Configuration;

    /**
     * Subscriptions
     */
    public subscriptions: Map<string, (data: string) => void> = new Map();

    /**
     * Constructor
     *
     * @param config
     */
    constructor(config: Configuration) {
        this.config = config;
        this.socket = new Socket();
        this.socket.setNoDelay(true); // This is required as packets can be small and nagle algorithm can lock.
    }

    /**
     * Connect
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            // If something goes wrong with this connection ...
            /* c8 ignore start */
            this.socket.once('error', (err: Error) => {
                // Marks this connection as not alive.
                this.alive = false;

                // Reject ... This only will happen on failed connection.
                reject(err);
            });
            /* c8 ignore stop */
            // This isn't something that you can test without simulating ...
            //
            // The previous code case is something that the user should be **aware**.
            //
            // I mean taking actions when you say "connect" but that never happens for external conditions:
            //
            // - Server is gone.
            // - Unreachable address.
            // - And more...
            //
            // Find info about the TCP errors on connection ...

            // We are going to try to connect.
            this.socket.connect(this.config.port, this.config.host, () => {
                // We bind data event to the onData handler.
                this.socket.on('data', chunk => this.onData(chunk));
                // We bind error event to the OnError handler.
                this.socket.on('error', error => this.onError(error));

                // We mark this connection as alive.
                this.alive = true;

                // We are going to wait until we have a writable socket.
                this.waitUntilReachConnectedStatus(resolve, reject);
            });
        });
    }

    /**
     * Wait until reach connected status
     *
     * @param resolve
     * @param reject
     */
    waitUntilReachConnectedStatus(resolve: any, reject: any) {
        /* c8 ignore start */
        // You have at least X attempts
        const max_attempts =
            this.config.connection_configuration?.on_wait_for_writable_socket_timeout_per_attempt ??
            3;
        // Per attempt, you'll be waiting for Y ms.
        const timeout_per_attempt =
            this.config.connection_configuration?.on_wait_for_writable_socket_timeout_per_attempt ??
            1000;
        /* c8 ignore stop */

        if (this.alive && this.socket.writable) {
            resolve();
            /* c8 ignore start */
        } else if (
            this.alive &&
            !this.socket.writable &&
            this.wait_for_writable_socket_attempts <= max_attempts
        ) {
            setTimeout(() => {
                this.waitUntilReachConnectedStatus(resolve, reject);
            }, timeout_per_attempt);
            this.wait_for_writable_socket_attempts++;
        } else {
            reject();
        }
        /* c8 ignore stop */
    }

    /**
     * Send
     *
     * @param request
     */
    send(request: Request | Request[]): Promise<Response | Response[]> {
        const requests = Array.isArray(request) ? request : [request];

        const buffers = requests.map(req => BuildRequest(req, this.config.value_size));

        const expectedTypes = requests.map(req => GetExpectedResponseType(req));

        return new Promise((resolve, reject) => {
            // We gonna to define an array of responses
            const responses: Response[] = [];

            // Imagine that your socket for external reasons has been destroyed, errored, or ended.
            // We can't process this request, at least, this socket can't. This will be reported.
            /* c8 ignore start */
            if (!this.socket.writable) {
                reject(new Error("Socket isn't writable"));
            }
            /* c8 ignore stop */
            // This code isn't easy to test without simulating ...
            // I should create a test which exactly, during a set of test the socket has been gone.
            // In one case, we could send FIN before this to test it.
            // Anyway, this is something that the user must be **aware**.

            // On every buffer (request binary serialized) ...
            buffers.forEach((buffer, index) => {
                // We create an element on the requests queue.
                this.queue.push({
                    buffer: buffer, // Saving his buffer.
                    expectedType: expectedTypes[index], // The expected type based on request (status, query and get).
                    resolve: (response: Response) => {
                        // We're going to create a handler to be used on resolve.
                        // As response was resolved.
                        responses[index] = response; // We're going to push that response in the array
                        if (responses.length === requests.length) {
                            // If we have the same responses as requests then resolve.
                            // Finally, if we reach this point, we have all the responses so we can resolve.
                            resolve(
                                // If the request was a batch then return the response batch.
                                // If the request was only one then return the response.
                                Array.isArray(request) ? responses : responses[0]
                            );
                        }
                    },
                    reject: (err: Error) => {
                        // This case is when one request or one of many request fails.
                        // Then the entire promise will be rejected
                        // Remember that this function can accept an array of requests.
                        /* c8 ignore start */
                        reject(err);
                    },
                    /* c8 ignore stop */
                });
            });

            // Let's write
            this.socket.cork();
            for (const buffer of buffers) {
                this.socket.write(buffer);
            }
            process.nextTick(() => this.socket.uncork());
        });
    }

    /**
     * Flush queue
     *
     * @param error
     * @private
     */
    private flushQueue(error: Error) {
        // In other to flush queue we need to have elements
        /* c8 ignore start */
        while (this.queue.length > 0) {
            // We remove first one
            const current = this.queue.shift()!;
            // And reject them.
            current.reject(error);
        }
        /* c8 ignore stop */
    }

    /**
     * Handle incoming data
     *
     * @param chunk
     * @private
     */
    private onData(chunk: Buffer) {
        this.processPendingResponses(chunk);
    }

    /**
     * Reconnect
     */
    public async reconnect() {
        // If we receive a reconnect order from other context
        /* c8 ignore start */
        try {
            // We need to try disconnect first.
            await this.disconnect();
            // And try to reconnect again.
            await this.connect();
        } catch (e) {
            this.alive = false;
            // If something goes wrong then we report the event.
            throw e;
        }
    }
    /* c8 ignore stop */

    /**
     * Is alive
     */
    public isAlive() {
        return this.alive && !this.socket.destroyed;
    }

    public parseEvent(buffer: Buffer) {
        /* c8 ignore start */
        if (buffer.length < ValueSize.UInt8 + this.config.value_size) return buffer;
        /* c8 ignore stop */

        const channel_size = Number(read(buffer, 1, ValueSize.UInt8));
        const value_size = Number(read(buffer, 2, this.config.value_size));

        /* c8 ignore start */
        if (buffer.length < ValueSize.UInt8 + this.config.value_size + channel_size + value_size)
            return buffer;
        /* c8 ignore stop */

        let scoped_offset = 2 + this.config.value_size;
        const channel = buffer.subarray(scoped_offset, scoped_offset + channel_size).toString();
        scoped_offset += channel_size;
        const value = buffer.subarray(scoped_offset, scoped_offset + value_size).toString();
        scoped_offset += value_size;

        if (this.subscriptions.has(channel)) {
            const callback = this.subscriptions.get(channel);
            if (callback) {
                callback(value);
            }
        }
        return buffer.subarray(scoped_offset, buffer.length);
    }

    /**
     * Process pending responses
     *
     * @private
     */
    private processPendingResponses(chunk: Buffer) {
        // Imagine that you receive an un chuck of bytes.
        // The current iteration will take the existing buffer and the new one, gluing it.
        let iterationBuffer = Buffer.concat([this.buffer, chunk]);

        // We start from the offset zero
        let offset = 0;

        // While something exists on the queue
        // And the offset is in the iteration buffer range then...
        while (offset < iterationBuffer.length) {
            if (this.queue.length > 0) {
                // We take the first request on the queue
                const current = this.queue[0];

                // We take his expected type
                const type = current.expectedType;

                // We verify if we are passed of the range again (sequenced while iterations)
                /* c8 ignore start */
                if (offset >= iterationBuffer.length) break;
                /* c8 ignore stop */

                // We take the first byte
                const firstByte = iterationBuffer.readUInt8(offset);

                /* c8 ignore start */
                if (firstByte == 0x19) {
                    iterationBuffer = this.parseEvent(iterationBuffer);
                    continue;
                }
                /* c8 ignore stop */

                // We try process and we pass
                const processed = this.tryHandleResponse(
                    type, // To know if we expect STATUS, QUERY or GET response.
                    current, // To eventually resolve the request
                    iterationBuffer, // To decode
                    firstByte, // To know if was success or failed
                    offset // The offset to be used as current index of the buffer
                );

                // If nothing was obtained we break the while
                /* c8 ignore start */
                if (!processed) break;
                /* c8 ignore stop */

                // If something was obtained then we have a new offset
                offset = processed.offset;

                // We remove the element from the queue
                this.queue.shift();
            } else {
                // We have nothing on the queue but we have bytes
                const firstByte = iterationBuffer.readUInt8(offset);

                // If this is an event then react
                // Otherwise break the while statement
                if (firstByte == 0x19) {
                    iterationBuffer = this.parseEvent(iterationBuffer);
                    /* c8 ignore start */
                } else {
                    break;
                }
                /* c8 ignore stop */
            }
        }

        // If the chunk contain not completed responses
        // We store the excedent.
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
        type: ResponseType,
        current: QueuedRequest,
        buffer: Buffer,
        firstByte: number,
        offset: number
    ): { offset: number } | false {
        // If the response was STATUS
        if (type === 'status') {
            // We take the byte on the offset
            const slice = buffer.subarray(offset, offset + 1);
            // And parse
            return this.tryParse(slice, type, current, offset + 1);
        }

        // If the response is QUERY
        if (type === 'query') {
            // And was failed then
            if (firstByte === 0x00) {
                // It can be considered as STATUS response
                const slice = buffer.subarray(offset, offset + 1);
                // And parsed
                return this.tryParse(slice, type, current, offset + 1);
            }

            // Otherwise we have more bytes to read
            // Status + TTL + TTL Type + Quota
            const expectedLength = this.config.value_size * 2 + 2;

            // If the buffer is less than the expected value is this is an incomplete response
            // And report this try handle response as failed.
            /* c8 ignore start */
            if (buffer.length < offset + expectedLength) return false;
            /* c8 ignore stop */

            // Otherwise we take the buffer completed
            const slice = buffer.subarray(offset, offset + expectedLength);
            // And parse
            return this.tryParse(slice, type, current, offset + expectedLength);
        }

        if (type == 'list' || type == 'stats' || type == 'channels') {
            let scoped_offset = offset + 8 + 1;
            /* c8 ignore start */
            if (buffer.length < scoped_offset) return false;
            /* c8 ignore stop */

            const fragments = Number(read(buffer, offset + 1, ValueSize.UInt64));
            const per_key_length =
                type === 'list' ? 11 + this.config.value_size : type == 'stats' ? 33 : 25;

            for (let e = 0; e < fragments; e++) {
                /* c8 ignore start */
                if (buffer.length < scoped_offset + 8) return false;
                /* c8 ignore stop */

                const current_fragment = Number(read(buffer, scoped_offset, ValueSize.UInt64)); // NOSONAR
                scoped_offset += 8;

                /* c8 ignore start */
                if (buffer.length < scoped_offset + 8) return false;
                /* c8 ignore stop */

                const current_number_of_keys = Number(
                    read(buffer, scoped_offset, ValueSize.UInt64)
                );
                scoped_offset += 8;

                /* c8 ignore start */
                if (buffer.length < scoped_offset + current_number_of_keys * per_key_length)
                    return false;
                /* c8 ignore stop */

                let total_bytes_on_channels = 0;
                for (let i = 0; i < current_number_of_keys; i++) {
                    const key_length = Number(read(buffer, scoped_offset, ValueSize.UInt8));
                    scoped_offset += per_key_length;
                    total_bytes_on_channels += key_length;
                }

                scoped_offset += total_bytes_on_channels;

                /* c8 ignore start */
                if (buffer.length < scoped_offset) return false;
                /* c8 ignore stop */
            }

            const slice = buffer.subarray(offset, offset + scoped_offset);
            return this.tryParse(slice, type, current, offset + scoped_offset);
        }

        if (type == 'connections') {
            let scoped_offset = offset + 8 + 1;

            /* c8 ignore start */
            if (buffer.length < scoped_offset) return false;
            /* c8 ignore stop */

            const fragments = Number(read(buffer, offset + 1, ValueSize.UInt64));
            const per_key_connection_size = 237;

            for (let e = 0; e < fragments; e++) {
                /* c8 ignore start */
                if (buffer.length < scoped_offset + 8) return false;
                /* c8 ignore stop */

                const current_fragment = Number(read(buffer, scoped_offset, ValueSize.UInt64)); // NOSONAR
                scoped_offset += 8;

                /* c8 ignore start */
                if (buffer.length < scoped_offset + 8) return false;
                /* c8 ignore stop */

                const current_number_of_connections = Number(
                    read(buffer, scoped_offset, ValueSize.UInt64)
                );
                scoped_offset += 8;

                /* c8 ignore start */
                if (
                    buffer.length <
                    scoped_offset + current_number_of_connections * per_key_connection_size
                )
                    return false;
                /* c8 ignore stop */

                scoped_offset += current_number_of_connections * per_key_connection_size;
            }

            const slice = buffer.subarray(offset, offset + scoped_offset);
            return this.tryParse(slice, type, current, offset + scoped_offset);
        }

        if (type == 'connection') {
            /* c8 ignore start */
            if (firstByte === 0x00) {
                const slice = buffer.subarray(offset, offset + 1);
                return this.tryParse(slice, type, current, offset + 1);
            }
            /* c8 ignore stop */

            let scoped_offset = offset + 1 + 237;

            /* c8 ignore start */
            if (buffer.length < scoped_offset) return false;
            /* c8 ignore stop */

            const slice = buffer.subarray(offset, offset + scoped_offset);
            return this.tryParse(slice, type, current, offset + scoped_offset);
        }

        if (type == 'info') {
            /* c8 ignore start */
            if (buffer.length < 432) return false;
            /* c8 ignore stop */

            const slice = buffer.subarray(offset, offset + 433);
            return this.tryParse(slice, type, current, offset + 433);
        }

        if (type == 'whoami') {
            /* c8 ignore start */
            if (buffer.length < 17) return false;
            /* c8 ignore stop */

            const slice = buffer.subarray(offset, offset + 17);
            return this.tryParse(slice, type, current, offset + 17);
        }

        if (type == 'stat') {
            if (firstByte === 0x00) {
                const slice = buffer.subarray(offset, offset + 1);
                return this.tryParse(slice, type, current, offset + 1);
            }

            /* c8 ignore start */
            if (buffer.length < 32) return false;
            /* c8 ignore stop */

            const slice = buffer.subarray(offset, offset + 33);
            return this.tryParse(slice, type, current, offset + 33);
        }

        if (type == 'channel') {
            /* c8 ignore start */
            if (firstByte === 0x00) {
                const slice = buffer.subarray(offset, offset + 1);
                return this.tryParse(slice, type, current, offset + 1);
            }
            /* c8 ignore stop */

            /* c8 ignore start */
            if (buffer.length < 9) return false;
            /* c8 ignore stop */

            const connections = Number(read(buffer, offset + 1, ValueSize.UInt64));

            /* c8 ignore start */
            if (buffer.length < 9 + connections * 40) return false;
            /* c8 ignore stop */

            const slice = buffer.subarray(offset, offset + 1 + 8 + connections * 40);
            return this.tryParse(slice, type, current, offset + 1 + 8 + connections * 40);
        }

        // If the response is GET
        if (type === 'get') {
            // And was failed then
            if (firstByte === 0x00) {
                // It can be considered as STATUS response
                const slice = buffer.subarray(offset, offset + 1);
                // And parsed
                return this.tryParse(slice, type, current, offset + 1);
            }

            // Otherwise we have more bytes to read
            // Status + TTL + TTL Type + SizeOf(Value)
            const expectedLength = this.config.value_size * 2 + 2;

            // If the buffer is less than the expected value is this is an incomplete response
            // And report this try handle response as failed.
            /* c8 ignore start */
            if (buffer.length < offset + expectedLength) return false;
            /* c8 ignore stop */

            // Otherwise we take the value of the lasts 2 bytes as considered as SizeOf(Value)
            const valueSize = read(buffer, 2 + this.config.value_size, this.config.value_size);

            // If the buffer is less than the expected value plus SizeOf(Value) is this is an incomplete response
            // And report this try handle response as failed.
            /* c8 ignore start */
            if (buffer.length < offset + expectedLength + Number(valueSize)) return false;
            /* c8 ignore stop */

            // Otherwise the take the buffer complete
            const slice = buffer.subarray(offset, offset + expectedLength + Number(valueSize));

            // And parse
            return this.tryParse(slice, type, current, offset + expectedLength + Number(valueSize));
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
    public tryParse(
        slice: Buffer,
        type: ResponseType,
        current: QueuedRequest,
        nextOffset: number
    ): { offset: number } {
        try {
            const response = ParseResponse(slice, type, this.config.value_size);
            current.resolve(response);
            /* c8 ignore start */
        } catch (e) {
            // This catch require parse a malformed response.
            // Basically the server never respond malformed.
            // In order to test this we need create a valid connection.
            // And directly invoke this method.
            current.reject(e);
        }
        /* c8 ignore stop */
        // Anyway, we return the new offset to be used.
        return { offset: nextOffset };
    }

    /**
     * Handle error
     *
     * @param error
     * @private
     */
    private onError(error: Error) {
        // This function require external conditions to be tested
        /* c8 ignore start */
        this.flushQueue(error);
    }
    /* c8 ignore stop */

    /**
     * Disconnect
     */
    async disconnect(): Promise<void> {
        return new Promise(resolve => {
            this.socket.removeAllListeners();
            this.socket.end(() => {
                this.flushQueue(new Error('Socket has been manually closed'));
                resolve();
            });
        });
    }
}
