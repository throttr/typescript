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
    Request,
    RequestType,
    FullResponse,
    SimpleResponse,
} from './types';

/**
 * Serialize request
 */
export function serializeRequest(request: Request): Buffer {
    switch (request.type) {
        case RequestType.Insert: {
            const consumerIdBuffer = Buffer.from(request.consumer_id, 'utf-8');
            const resourceIdBuffer = Buffer.from(request.resource_id, 'utf-8');

            const buffer = Buffer.allocUnsafe(
                1 + // request_type
                8 + // quota (little endian)
                8 + // usage (little endian)
                1 + // ttl_type
                8 + // ttl (little endian)
                1 + // consumer_id_size
                1 + // resource_id_size
                consumerIdBuffer.length +
                resourceIdBuffer.length
            );

            let offset = 0;
            buffer.writeUInt8(request.type, offset);
            offset += 1;
            buffer.writeBigUInt64LE(request.quota, offset);
            offset += 8;
            buffer.writeBigUInt64LE(request.usage, offset);
            offset += 8;
            buffer.writeUInt8(request.ttl_type, offset);
            offset += 1;
            buffer.writeBigUInt64LE(request.ttl, offset);
            offset += 8;
            buffer.writeUInt8(consumerIdBuffer.length, offset);
            offset += 1;
            buffer.writeUInt8(resourceIdBuffer.length, offset);
            offset += 1;
            consumerIdBuffer.copy(buffer, offset);
            offset += consumerIdBuffer.length;
            resourceIdBuffer.copy(buffer, offset);
            return buffer;
        }

        case RequestType.Query:
        case RequestType.Purge: {
            const consumerIdBuffer = Buffer.from(request.consumer_id, 'utf-8');
            const resourceIdBuffer = Buffer.from(request.resource_id, 'utf-8');

            const buffer = Buffer.allocUnsafe(
                1 + // request_type
                1 + // consumer_id_size
                1 + // resource_id_size
                consumerIdBuffer.length +
                resourceIdBuffer.length
            );

            let offset = 0;
            buffer.writeUInt8(request.type, offset);
            offset += 1;
            buffer.writeUInt8(consumerIdBuffer.length, offset);
            offset += 1;
            buffer.writeUInt8(resourceIdBuffer.length, offset);
            offset += 1;
            consumerIdBuffer.copy(buffer, offset);
            offset += consumerIdBuffer.length;
            resourceIdBuffer.copy(buffer, offset);
            return buffer;
        }

        case RequestType.Update: {
            const consumerIdBuffer = Buffer.from(request.consumer_id, 'utf-8');
            const resourceIdBuffer = Buffer.from(request.resource_id, 'utf-8');

            const buffer = Buffer.allocUnsafe(
                1 + // request_type
                1 + // attribute
                1 + // change
                8 + // value (little endian)
                1 + // consumer_id_size
                1 + // resource_id_size
                consumerIdBuffer.length +
                resourceIdBuffer.length
            );

            let offset = 0;
            buffer.writeUInt8(request.type, offset);
            offset += 1;
            buffer.writeUInt8(request.attribute, offset);
            offset += 1;
            buffer.writeUInt8(request.change, offset);
            offset += 1;
            buffer.writeBigUInt64LE(request.value, offset);
            offset += 8;
            buffer.writeUInt8(consumerIdBuffer.length, offset);
            offset += 1;
            buffer.writeUInt8(resourceIdBuffer.length, offset);
            offset += 1;
            consumerIdBuffer.copy(buffer, offset);
            offset += consumerIdBuffer.length;
            resourceIdBuffer.copy(buffer, offset);
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
 */
export function parseResponse(
    buffer: Buffer,
    expected: 'full' | 'simple'
): FullResponse | SimpleResponse {
    if (expected === 'full') {
        if (buffer.length !== 18) {
            throw new Error(`Invalid full response length: ${buffer.length}`);
        }
        const allowed = buffer.readUInt8(0) === 1;
        const quota_remaining = buffer.readBigUInt64LE(1);
        const ttl_type = buffer.readUInt8(9);
        const ttl_remaining = buffer.readBigInt64LE(10);

        return {
            allowed,
            quota_remaining,
            ttl_type,
            ttl_remaining,
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
