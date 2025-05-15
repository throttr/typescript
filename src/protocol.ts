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

import {
    GetResponse,
    QueryResponse,
    Request,
    RequestType,
    ResponseType,
    StatusResponse,
    TTLType,
    ValueSize,
} from './types';
import { read, writeOnRequest, writeByValue } from './utils';

/**
 * Build request
 *
 * @param request
 * @param value_size
 */
export const BuildRequest = (request: Request, value_size: ValueSize): Buffer => {
    switch (request.type) {
        case RequestType.Insert: {
            const keyBuffer = Buffer.from(request.key, 'utf-8');

            const buffer = Buffer.allocUnsafe(
                1 + // request_type
                value_size.valueOf() + // quota (little endian)
                1 + // ttl_type
                value_size.valueOf() + // ttl (little endian)
                1 + // key_size
                keyBuffer.length
            );

            let offset = 0;
            buffer.writeUInt8(request.type, offset);
            offset += 1;
            writeOnRequest(request, buffer, 'quota', offset, value_size);
            offset += value_size.valueOf();
            buffer.writeUInt8(request.ttl_type, offset);
            offset += 1;
            writeOnRequest(request, buffer, 'ttl', offset, value_size);
            offset += value_size.valueOf();
            buffer.writeUInt8(keyBuffer.length, offset);
            offset += 1;
            keyBuffer.copy(buffer, offset);
            return buffer;
        }

        case RequestType.Set: {
            const keyBuffer = Buffer.from(request.key, 'utf-8');
            const valueBuffer = Buffer.from(request.value, 'utf-8');

            const buffer = Buffer.allocUnsafe(
                1 + // request_type
                1 + // ttl_type
                value_size.valueOf() + // ttl (little endian)
                1 + // key_size
                value_size.valueOf() + // value_size
                keyBuffer.length +
                valueBuffer.length
            );

            let offset = 0;
            buffer.writeUInt8(request.type, offset);
            offset += 1;
            buffer.writeUInt8(request.ttl_type, offset);
            offset += 1;
            writeOnRequest(request, buffer, 'ttl', offset, value_size);
            offset += value_size.valueOf();
            buffer.writeUInt8(keyBuffer.length, offset);
            offset += 1;
            writeByValue(buffer, valueBuffer.length, offset, value_size);
            offset += value_size.valueOf();
            keyBuffer.copy(buffer, offset);
            offset += keyBuffer.length;
            valueBuffer.copy(buffer, offset);
            return buffer;
        }

        case RequestType.Query:
        case RequestType.Get:
        case RequestType.Purge: {
            const keyBuffer = Buffer.from(request.key, 'utf-8');

            const buffer = Buffer.allocUnsafe(
                1 + // request_type
                1 + // key_size
                keyBuffer.length
            );

            let offset = 0;
            buffer.writeUInt8(request.type, offset);
            offset += 1;
            buffer.writeUInt8(keyBuffer.length, offset);
            offset += 1;
            keyBuffer.copy(buffer, offset);
            return buffer;
        }

        case RequestType.Update: {
            const keyBuffer = Buffer.from(request.key, 'utf-8');

            const buffer = Buffer.allocUnsafe(
                1 + // request_type
                1 + // attribute
                1 + // change
                value_size.valueOf() + // value (little endian)
                1 + // key_size
                keyBuffer.length
            );

            let offset = 0;
            buffer.writeUInt8(request.type, offset);
            offset += 1;
            buffer.writeUInt8(request.attribute, offset);
            offset += 1;
            buffer.writeUInt8(request.change, offset);
            offset += 1;
            writeOnRequest(request, buffer, 'value', offset, value_size);
            offset += value_size.valueOf();
            buffer.writeUInt8(keyBuffer.length, offset);
            offset += 1;
            keyBuffer.copy(buffer, offset);
            return buffer;
        }

        default:
            throw new Error('Unsupported request type');
    }
}

/**
 * Parse response
 *
 * @param buffer
 * @param expected
 * @param value_size
 */
export function ParseResponse(buffer: Buffer, expected: ResponseType, value_size: ValueSize) {
    if (expected === 'query') {
        if (buffer.length === 1) {
            return {
                success: false,
                quota: 0,
                ttl_type: TTLType.Nanoseconds,
                ttl: 0,
            };
        }

        let offset = 0;
        const success = buffer.readUInt8(offset) === 1;
        offset += 1;
        const quota = read(buffer, offset, value_size);
        offset += value_size.valueOf();
        const ttl_type = buffer.readUInt8(offset);
        offset += 1;
        const ttl = read(buffer, offset, value_size);

        return {
            success: success,
            quota: quota,
            ttl_type: ttl_type,
            ttl: ttl,
        } as QueryResponse;
    } else if (expected === 'status') {
        if (buffer.length !== 1) {
            throw new Error(`Invalid status response length: ${buffer.length}`);
        }
        return {
            success: buffer.readUInt8(0) === 1,
        } as StatusResponse;
    } else if (buffer.length === 1) {
        return {
            success: false,
            quota: 0,
            ttl_type: TTLType.Nanoseconds,
            ttl: 0,
        };
    } else {
        let offset = 0;
        const success = buffer.readUInt8(offset) === 1;
        offset += 1;
        const ttl_type = buffer.readUInt8(offset);
        offset += 1;
        const ttl = read(buffer, offset, value_size);
        offset += value_size.valueOf();
        read(buffer, offset, value_size);
        offset += value_size.valueOf();
        const value = buffer.toString('utf-8', offset);

        return {
            success: success,
            ttl_type: ttl_type,
            ttl: ttl,
            value: value,
        } as GetResponse;
    }
}

/**
 * Get expected response type
 *
 * @param request
 */
export function GetExpectedResponseType(request: Request): ResponseType {
    switch (request.type) {
        case RequestType.Update:
        case RequestType.Purge:
        case RequestType.Insert:
        case RequestType.Set:
            return 'status';
        case RequestType.Query:
            return 'query';
        case RequestType.Get:
            return 'get';
        /* c8 ignore start */
        default:
            throw new Error('Unknown request type');
        /* c8 ignore stop */
    }
}
