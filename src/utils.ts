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

import { FullResponse, Request, RequestType, SimpleResponse, TTLType, ValueSize } from './types';

/* c8 ignore start */
function writeOnRequest(
    request: Request,
    buffer: Buffer,
    attribute: any,
    offset: number,
    value_size: ValueSize
) {
    switch (value_size) {
        case ValueSize.UInt64:
            // @ts-ignore
            buffer.writeBigUInt64LE(BigInt(request[attribute]), offset);
            break;
        case ValueSize.UInt32:
            // @ts-ignore
            buffer.writeUint32LE(request[attribute], offset);
            break;
        case ValueSize.UInt16:
            // @ts-ignore
            buffer.writeUint16LE(request[attribute], offset);
            break;
        case ValueSize.UInt8:
            // @ts-ignore
            buffer.writeUint8(request[attribute], offset);
            break;
    }
}

function read(buffer: Buffer, offset: number, value_size: ValueSize) {
    switch (value_size) {
        case ValueSize.UInt64:
            return buffer.readBigUInt64LE(offset);
        case ValueSize.UInt32:
            return buffer.readUint32LE(offset);
        case ValueSize.UInt16:
            return buffer.readUint16LE(offset);
        case ValueSize.UInt8:
            return buffer.readUInt8(offset);
    }
}
/* c8 ignore stop */

/**
 * Serialize request
 *
 * @param request
 * @param value_size
 */
export function serializeRequest(request: Request, value_size: ValueSize): Buffer {
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

        case RequestType.Query:
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
export function parseResponse(
    buffer: Buffer,
    expected: 'full' | 'simple',
    value_size: ValueSize
): FullResponse | SimpleResponse {
    if (expected === 'full') {
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
        };
    } else {
        if (buffer.length !== 1) {
            throw new Error(`Invalid simple response length: ${buffer.length}`);
        }
        return {
            success: buffer.readUInt8(0) === 1,
        };
    }
}
