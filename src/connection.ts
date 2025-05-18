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
import {Request, Response, ResponseType, QueuedRequest, ValueSize, Configuration} from './types';
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
    private config: Configuration;

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
            this.socket.once('error', (err: Error) => {
                // Marks this connection as not alive.
                this.alive = false;

                // Reject ... This only will happen on failed connection.
                reject(err);
            });
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
        // You have at least X attempts
        const max_attempts = (this.config.connection_configuration?.on_wait_for_writable_socket_timeout_per_attempt ?? 3);
        // Per attempt, you'll be waiting for Y ms.
        const timeout_per_attempt = this.config.connection_configuration?.on_wait_for_writable_socket_timeout_per_attempt ?? 1000;

        // On alive reported connection but not writable socket and not reached the max attempts
        if (this.alive &&
            !this.socket.writable &&
            this.wait_for_writable_socket_attempts <= max_attempts) {
            // Wait for
            setTimeout(() => {
                this.waitUntilReachConnectedStatus(resolve, reject);
            }, timeout_per_attempt);
            // Increase the attempts
            this.wait_for_writable_socket_attempts++;
        } else {
            // Otherwise
            // If is alive and socket is writable
            if (this.alive && this.socket.writable) {
                resolve();
            } else {
                reject();
            }
        }
    }

    /**
     * Send
     *
     * @param request
     */
    send(request: Request | Request[]): Promise<Response | Response[]> {
        const requests = Array.isArray(request) ? request : [request];

        requests.forEach((item, index) => console.log("Request:", index, item));

        const buffers = requests.map(req => BuildRequest(req, this.config.value_size));

        const expectedTypes = requests.map(req => GetExpectedResponseType(req));

        return new Promise(async (resolve, reject) => {
            // We gonna to define an array of responses
            const responses: Response[] = [];

            // Imagine that your socket for external reasons has been destroyed, errored, or ended.
            // We can't process this request, at least, this socket can't. This will be reported.
            if (!this.socket.writable) {
                reject(new Error("Socket isn't writable"));
            }
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
                    resolve: (response: Response) => { // We're going to create a handler to be used on resolve.
                        // As response was resolved.
                        responses[index] = response; // We're going to push that response in the array
                        if (responses.length === requests.length) { // If we have the same responses as requests then resolve.
                            // Finally, if we reach this point, we have all the responses so we can resolve.
                            resolve(
                                // If the request was a batch then return the response batch.
                                // If the request was only one then return the response.
                                Array.isArray(request) ?
                                    responses : responses[0]
                            );
                        }
                    },
                    reject: (err: Error) => {
                        // This case is when one request or one of many request fails.
                        // Then the entire promise will be rejected
                        // Remember that this function can accept an array of requests.
                        reject(err);
                    },
                });
            });

            // Let's write
            console.log(new Date().toString(), "WRITE > ", Buffer.concat(buffers).toString('hex'))
            const flushed = this.socket.write(Buffer.concat(buffers));
            if (!flushed) {
                await new Promise(resolve => this.socket.once('drain', resolve));
            }
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
        while (this.queue.length > 0) {
            // We remove first one
            const current = this.queue.shift()!;
            // And reject them.
            current.reject(error);
        }
    }

    /**
     * Handle incoming data
     *
     * @param chunk
     * @private
     */
    private onData(chunk: Buffer) {
        // This protects processing concurrent of responses
        console.log(new Date().toString(), "READ < ", chunk.toString('hex'))
        setImmediate(() => this.processPendingResponses(chunk));
    }

    /**
     * Reconnect
     */
    public async reconnect() {
        // If we receive a reconnect order from other context
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

    /**
     * Is alive
     */
    public isAlive() {
        return this.alive && !this.socket.destroyed;
    }

    /**
     * Process pending responses
     *
     * @private
     */
    private processPendingResponses(chunk: Buffer) {
        // Imagine that you receive an un chuck of bytes.
        // The current iteration will take the existing buffer and the new one, gluing it.
        const iterationBuffer = Buffer.concat([this.buffer, chunk]);
        // We start from the offset zero
        let offset = 0;

        // While something exists on the queue
        // And the offset is in the iteration buffer range then...
        while (this.queue.length > 0 && offset < iterationBuffer.length) {

            // We take the first request on the queue
            const current = this.queue[0];

            // We take his expected type
            const type = current.expectedType;

            // We verify if we are passed of the range again (sequenced while iterations)
            if (offset >= iterationBuffer.length) break;

            // We take the first byte
            const firstByte = iterationBuffer.readUInt8(offset);
            offset++;

            // We try process and we pass
            const processed = this.tryHandleResponse(
                type, // To know if we expect STATUS, QUERY or GET response.
                current, // To eventually resolve the request
                iterationBuffer, // To decode
                firstByte, // To know if was success or failed
                offset // The offset to be used as current index of the buffer
            );

            // If nothing was obtained we break the while
            if (!processed) break;

            // If something was obtained then we have a new offset
            offset = processed.offset;

            // We remove the element from the queue
            this.queue.shift();
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
            const slice = buffer.subarray(offset - 1, offset);
            // And parse
            return this.tryParse(slice, type, current, offset);
        }

        // If the response is QUERY
        if (type === 'query') {
            // And was failed then
            if (firstByte === 0x00) {
                // It can be considered as STATUS response
                const slice = buffer.subarray(offset - 1, offset);
                // And parsed
                return this.tryParse(slice, type, current, offset);
            }

            // Otherwise we have more bytes to read
            // Status + TTL + TTL Type + Quota
            const expectedLength = this.config.value_size * 2 + 2;

            // If the buffer is less than the expected value is this is an incomplete response
            // And report this try handle response as failed.
            if (buffer.length < offset - 1 + expectedLength) return false;

            // Otherwise we take the buffer completed
            const slice = buffer.subarray(offset - 1, offset - 1 + expectedLength);
            // And parse
            return this.tryParse(slice, type, current, offset - 1 + expectedLength);
        }

        // If the response is GET
        if (type === 'get') {
            // And was failed then
            if (firstByte === 0x00) {
                // It can be considered as STATUS response
                const slice = buffer.subarray(offset - 1, offset);
                // And parsed
                return this.tryParse(slice, type, current, offset);
            }

            // Otherwise we have more bytes to read
            // Status + TTL + TTL Type + SizeOf(Value)
            const expectedLength = this.config.value_size * 2 + 2;

            // If the buffer is less than the expected value is this is an incomplete response
            // And report this try handle response as failed.
            if (buffer.length < offset - 1 + expectedLength) return false;

            // Otherwise we take the value of the lasts 2 bytes as considered as SizeOf(Value)
            const valueSize = read(buffer, 2 + this.config.value_size, this.config.value_size);

            // If the buffer is less than the expected value plus SizeOf(Value) is this is an incomplete response
            // And report this try handle response as failed.
            if (buffer.length < offset - 1 + expectedLength + Number(valueSize)) return false;

            // Otherwise the take the buffer complete
            const slice = buffer.subarray(
                offset - 1,
                offset - 1 + expectedLength + Number(valueSize)
            );

            // And parse
            return this.tryParse(
                slice,
                type,
                current,
                offset - 1 + expectedLength + Number(valueSize)
            );
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
            console.log(new Date().toString(), "Response", response);
            current.resolve(response);
        } catch (e) {
            // This catch require parse a malformed response.
            // Basically the server never respond malformed.
            // In order to test this we need create a valid connection.
            // And directly invoke this method.
            console.log(new Date().toString(), "Rejected response", slice.toString('hex'));
            current.reject(e);
        }
        // Anyway, we return the new offset to be used.
        return { offset: nextOffset };
    }

    /**
     * Handle error
     *
     * @param error
     * @private
     */
    private onError(error: Error) { // This function require external conditions to be tested
        this.flushQueue(error);
    }

    /**
     * Disconnect
     */
    async disconnect() : Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket.removeAllListeners();
                this.socket.end(() => {
                    this.flushQueue(new Error('Socket has been manually closed'));
                    resolve()
                });
            } catch (e) {
                reject(e);
            }
        });
    }
}
