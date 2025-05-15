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
    ValueSize,
} from './types';

/* c8 ignore start */
/**
 * Write on request
 *
 * @param request
 * @param buffer
 * @param attribute
 * @param offset
 * @param value_size
 */
export function writeOnRequest(
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

/**
 * Write by value
 *
 * @param buffer
 * @param value
 * @param offset
 * @param value_size
 */
export function writeByValue(buffer: Buffer, value: number, offset: number, value_size: ValueSize) {
    switch (value_size) {
        case ValueSize.UInt64:
            // @ts-ignore
            buffer.writeBigUInt64LE(BigInt(value), offset);
            break;
        case ValueSize.UInt32:
            // @ts-ignore
            buffer.writeUint32LE(value, offset);
            break;
        case ValueSize.UInt16:
            // @ts-ignore
            buffer.writeUint16LE(value, offset);
            break;
        case ValueSize.UInt8:
            // @ts-ignore
            buffer.writeUint8(value, offset);
            break;
    }
}

/**
 * Read
 *
 * @param buffer
 * @param offset
 * @param value_size
 */
export function read(buffer: Buffer, offset: number, value_size: ValueSize) {
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
