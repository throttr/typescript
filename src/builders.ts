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
    ChannelRequest,
    ConnectionRequest,
    EventRequest,
    GetRequest,
    InsertRequest,
    PublishRequest,
    PurgeRequest,
    QueryRequest,
    Request,
    SetRequest,
    StatRequest,
    SubscribeRequest,
    UnsubscribeRequest,
    UpdateRequest,
    ValueSize,
} from './types';
import { writeByValue, writeOnRequest } from './utils';

function PushTTL(
    buffer: Buffer,
    key: Buffer,
    request: SetRequest | InsertRequest,
    offset: number,
    value_size: ValueSize
) {
    buffer.writeUInt8(request.ttl_type, offset);
    offset += 1;
    writeOnRequest(request, buffer, 'ttl', offset, value_size);
    offset += value_size.valueOf();
    buffer.writeUInt8(key.length, offset);
    offset += 1;
    return offset;
}

export function BuildForInsert(request: InsertRequest, value_size: ValueSize): Buffer {
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
    offset = PushTTL(buffer, keyBuffer, request, offset, value_size);
    keyBuffer.copy(buffer, offset);
    return buffer;
}

export function BuildForSet(request: SetRequest, value_size: ValueSize): Buffer {
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
    offset = PushTTL(buffer, keyBuffer, request, offset, value_size);
    writeByValue(buffer, valueBuffer.length, offset, value_size);
    offset += value_size.valueOf();
    keyBuffer.copy(buffer, offset);
    offset += keyBuffer.length;
    valueBuffer.copy(buffer, offset);
    return buffer;
}

export function BuildForQueryGetPurgeStat(
    request: QueryRequest | GetRequest | PurgeRequest | StatRequest
): Buffer {
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

export function BuildForSubscribeUnsubscribeChannel(
    request: SubscribeRequest | UnsubscribeRequest | ChannelRequest
): Buffer {
    const channelBuffer = Buffer.from(request.channel, 'utf-8');

    const buffer = Buffer.allocUnsafe(
        1 + // request_type
            1 + // channel_size
            channelBuffer.length
    );

    let offset = 0;
    buffer.writeUInt8(request.type, offset);
    offset += 1;
    buffer.writeUInt8(channelBuffer.length, offset);
    offset += 1;
    channelBuffer.copy(buffer, offset);
    return buffer;
}

export function BuildForConnection(request: ConnectionRequest): Buffer {
    const idBytes = new Uint8Array(request.id.length / 2);
    for (let i = 0; i < request.id.length; i += 2) {
        idBytes[i / 2] = parseInt(request.id.slice(i, i + 2), 16);
    }

    const buffer = Buffer.allocUnsafe(
        1 + // request_type
            16 // ID
    );

    let offset = 0;
    buffer.writeUInt8(request.type, offset);
    offset += 1;

    Buffer.from(idBytes).copy(buffer, offset);
    return buffer;
}

export function BuildForPublishEvent(
    request: PublishRequest | EventRequest,
    value_size: ValueSize
): Buffer {
    const channelBuffer = Buffer.from(request.channel, 'utf-8');
    const valueBuffer = Buffer.from(request.value, 'utf-8');

    const buffer = Buffer.allocUnsafe(
        1 + // request_type
            1 + // channel_size
            value_size.valueOf() + // value_size
            channelBuffer.length +
            valueBuffer.length
    );

    let offset = 0;
    buffer.writeUInt8(request.type, offset);
    offset += 1;
    buffer.writeUInt8(channelBuffer.length, offset);
    offset += 1;
    writeByValue(buffer, valueBuffer.length, offset, value_size);
    offset += value_size.valueOf();
    channelBuffer.copy(buffer, offset);
    offset += channelBuffer.length;
    valueBuffer.copy(buffer, offset);
    return buffer;
}

export function BuildForUpdate(request: UpdateRequest, value_size: ValueSize): Buffer {
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

export function BuildForStatus(request: Request): Buffer {
    const buffer = Buffer.allocUnsafe(
        1 // request_type
    );

    let offset = 0;
    buffer.writeUInt8(request.type, offset);
    return buffer;
}
