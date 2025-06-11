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
    ChannelConnectionItem,
    ChannelItem,
    ChannelResponse,
    ChannelsResponse,
    ConnectionResponse,
    ConnectionsItem,
    ConnectionsResponse,
    GetResponse,
    InfoResponse,
    KeyType,
    ListItem,
    ListResponse,
    QueryResponse,
    StatResponse,
    StatsItem,
    StatsResponse,
    StatusResponse,
    TTLType,
    ValueSize,
} from './types';
import { read } from './utils';

/**
 * Get connection structure
 *
 * @param buffer
 * @param offset
 * @constructor
 */
function GetConnectionStructure(buffer: Buffer, offset: number): ConnectionsItem {
    return {
        id: buffer.subarray(offset, offset + 16).toString('hex'),
        type: Number(read(buffer, offset + 16, ValueSize.UInt8)),
        kind: Number(read(buffer, offset + 17, ValueSize.UInt8)),
        ip_version: Number(read(buffer, offset + 18, ValueSize.UInt8)),
        ip: buffer
            .subarray(offset + 19, offset + 35)
            .toString()
            .replace(/\x00+$/, ''), // NOSONAR
        port: Number(read(buffer, offset + 35, ValueSize.UInt16)),
        connected_at: Number(read(buffer, offset + 37, ValueSize.UInt64)),
        read_bytes: Number(read(buffer, offset + 45, ValueSize.UInt64)),
        write_bytes: Number(read(buffer, offset + 53, ValueSize.UInt64)),
        published_bytes: Number(read(buffer, offset + 61, ValueSize.UInt64)),
        received_bytes: Number(read(buffer, offset + 69, ValueSize.UInt64)),
        allocated_bytes: Number(read(buffer, offset + 77, ValueSize.UInt64)),
        consumed_bytes: Number(read(buffer, offset + 85, ValueSize.UInt64)),
        insert_requests: Number(read(buffer, offset + 93, ValueSize.UInt64)),
        set_requests: Number(read(buffer, offset + 101, ValueSize.UInt64)),
        query_requests: Number(read(buffer, offset + 109, ValueSize.UInt64)),
        get_requests: Number(read(buffer, offset + 117, ValueSize.UInt64)),
        update_requests: Number(read(buffer, offset + 125, ValueSize.UInt64)),
        purge_requests: Number(read(buffer, offset + 133, ValueSize.UInt64)),
        list_requests: Number(read(buffer, offset + 141, ValueSize.UInt64)),
        info_requests: Number(read(buffer, offset + 149, ValueSize.UInt64)),
        stat_requests: Number(read(buffer, offset + 157, ValueSize.UInt64)),
        stats_requests: Number(read(buffer, offset + 165, ValueSize.UInt64)),
        publish_requests: Number(read(buffer, offset + 173, ValueSize.UInt64)),
        subscribe_requests: Number(read(buffer, offset + 181, ValueSize.UInt64)),
        unsubscribe_requests: Number(read(buffer, offset + 189, ValueSize.UInt64)),
        connections_requests: Number(read(buffer, offset + 197, ValueSize.UInt64)),
        connection_requests: Number(read(buffer, offset + 205, ValueSize.UInt64)),
        channels_requests: Number(read(buffer, offset + 213, ValueSize.UInt64)),
        channel_requests: Number(read(buffer, offset + 221, ValueSize.UInt64)),
        whoami_requests: Number(read(buffer, offset + 229, ValueSize.UInt64)),
    };
}

export function HandleQuery(buffer: Buffer, value_size: ValueSize) {
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
}

export function HandleGet(buffer: Buffer, value_size: ValueSize) {
    if (buffer.length === 1) {
        return {
            success: false,
        } as GetResponse;
    }

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

export function HandleList(buffer: Buffer, value_size: ValueSize) {
    let success = buffer.at(0) == 0x01;
    let offset = 1;
    const fragments_count = Number(read(buffer, offset, ValueSize.UInt64));
    offset += ValueSize.UInt64;
    const per_key_length = 11 + value_size;
    const keys = [] as ListItem[];
    for (let e = 0; e < fragments_count; e++) {
        offset += 8;
        const current_number_of_keys = read(buffer, offset, ValueSize.UInt64);
        offset += 8;
        let total_bytes_on_channels = 0;
        let scoped_keys = [];
        for (let i = 0; i < current_number_of_keys; i++) {
            const key_length = Number(read(buffer, offset, ValueSize.UInt8));
            const key_type = Number(read(buffer, offset + 1, ValueSize.UInt8));
            const ttl_type = Number(read(buffer, offset + 2, ValueSize.UInt8));
            const time_point = Number(read(buffer, offset + 3, ValueSize.UInt64));
            const bytes_used = Number(read(buffer, offset + 3 + ValueSize.UInt64, value_size));

            let index = keys.push({
                key: '',
                key_length: key_length,
                /* c8 ignore start */
                // For some reason this code is unreachable based on codecov ...
                key_type: key_type === KeyType.Counter ? KeyType.Counter : KeyType.Buffer,
                /* c8 ignore stop */
                ttl_type: ttl_type as TTLType,
                expires_at: time_point,
                bytes_used: bytes_used,
            } as ListItem);

            scoped_keys.push({
                index: index,
                key_length: key_length,
            });

            total_bytes_on_channels += Number(key_length);
            offset += per_key_length;
        }

        for (let key of scoped_keys) {
            keys[key.index - 1].key = buffer.subarray(offset, offset + key.key_length).toString();
            offset += key.key_length;
        }
    }

    return {
        success: success,
        keys: keys,
    } as ListResponse;
}

export function HandleChannels(buffer: Buffer) {
    let success = buffer.at(0) == 0x01;
    let offset = 1;
    const fragments_count = Number(read(buffer, offset, ValueSize.UInt64));
    offset += ValueSize.UInt64;
    const per_key_length = 25;
    const channels = [] as ChannelItem[];
    const allowed = /^[a-zA-Z0-9 _.,:;!?@#&()'"-*]*$/; // NOSONAR
    for (let e = 0; e < fragments_count; e++) {
        offset += 8;
        const current_number_of_keys = read(buffer, offset, ValueSize.UInt64);
        offset += 8;
        let total_bytes_on_channels = 0;
        let scoped_channels = [];
        for (let i = 0; i < current_number_of_keys; i++) {
            const channel_length = Number(read(buffer, offset, ValueSize.UInt8));
            const read_bytes = Number(read(buffer, offset + 1, ValueSize.UInt64));
            const write_bytes = Number(
                read(buffer, offset + 1 + ValueSize.UInt64, ValueSize.UInt64)
            );
            const connections = Number(
                read(buffer, offset + 1 + ValueSize.UInt64 + ValueSize.UInt64, ValueSize.UInt64)
            );

            let index = channels.push({
                channel: '',
                channel_length: channel_length,
                read_bytes: read_bytes,
                write_bytes: write_bytes,
                connections: connections,
            } as ChannelItem);

            scoped_channels.push({
                index: index,
                key_length: channel_length,
            });

            total_bytes_on_channels += Number(channel_length);
            offset += per_key_length;
        }

        for (let channel of scoped_channels) {
            const scoped_buffer = buffer.subarray(offset, offset + channel.key_length);
            const channel_name = scoped_buffer.toString();
            channels[channel.index - 1].channel = allowed.test(channel_name)
                ? channel_name
                : scoped_buffer.toString('hex');
            offset += channel.key_length;
        }
    }

    return {
        success: success,
        channels: channels,
    } as ChannelsResponse;
}

export function HandleStats(buffer: Buffer) {
    let success = buffer.at(0) == 0x01;
    let offset = 1;
    const fragments_count = Number(read(buffer, offset, ValueSize.UInt64));
    offset += ValueSize.UInt64;
    const per_key_length = 33;
    const keys = [] as StatsItem[];
    for (let e = 0; e < fragments_count; e++) {
        offset += 8;
        const current_number_of_keys = read(buffer, offset, ValueSize.UInt64);
        offset += 8;
        let total_bytes_on_channels = 0;
        let scoped_keys = [];
        for (let i = 0; i < current_number_of_keys; i++) {
            const key_length = Number(read(buffer, offset, ValueSize.UInt8));
            const reads_per_minute = Number(read(buffer, offset + 1, ValueSize.UInt64));
            const writes_per_minute = Number(read(buffer, offset + 9, ValueSize.UInt64));
            const total_reads = Number(read(buffer, offset + 17, ValueSize.UInt64));
            const total_writes = Number(read(buffer, offset + 25, ValueSize.UInt64));

            let index = keys.push({
                key: '',
                key_length: key_length,
                reads_per_minute: reads_per_minute,
                writes_per_minute: writes_per_minute,
                total_reads: total_reads,
                total_writes: total_writes,
            } as StatsItem);

            scoped_keys.push({
                index: index,
                key_length: key_length,
            });

            total_bytes_on_channels += Number(key_length);
            offset += per_key_length;
        }

        for (let key of scoped_keys) {
            keys[key.index - 1].key = buffer.subarray(offset, offset + key.key_length).toString();
            offset += key.key_length;
        }
    }

    return {
        success: success,
        keys: keys,
    } as StatsResponse;
}

export function HandleConnections(buffer: Buffer) {
    let success = buffer.at(0) == 0x01;
    let offset = 1;
    const fragments_count = Number(read(buffer, offset, ValueSize.UInt64));
    offset += ValueSize.UInt64;
    const per_connection_length = 237;
    const connections = [] as ConnectionsItem[];
    for (let e = 0; e < fragments_count; e++) {
        offset += 8;
        const current_number_of_connections = read(buffer, offset, ValueSize.UInt64);
        offset += 8;
        for (let i = 0; i < current_number_of_connections; i++) {
            connections.push(GetConnectionStructure(buffer, offset));
            offset += per_connection_length;
        }
    }

    return {
        success: success,
        connections: connections,
    } as ConnectionsResponse;
}

export function HandleChannel(buffer: Buffer) {
    let success = buffer.at(0) == 0x01;
    let offset = 1;
    const per_connection_length = 40;
    const connections = [] as ChannelConnectionItem[];
    const current_number_of_connections = read(buffer, offset, ValueSize.UInt64);
    offset += 8;
    for (let i = 0; i < current_number_of_connections; i++) {
        connections.push({
            id: buffer.subarray(offset, offset + 16).toString('hex'),
            subscribed_at: Number(read(buffer, offset + 16, ValueSize.UInt64)),
            read_bytes: Number(read(buffer, offset + 24, ValueSize.UInt64)),
            write_bytes: Number(read(buffer, offset + 32, ValueSize.UInt64)),
        } as ChannelConnectionItem);

        offset += per_connection_length;
    }

    return {
        success: success,
        connections: connections,
    } as ChannelResponse;
}

export function HandleConnection(buffer: Buffer) {
    if (buffer.length === 1) {
        return {
            success: false,
        } as ConnectionResponse;
    }

    let success = buffer.at(0) == 0x01;
    let offset = 1;
    return {
        success: success,
        ...GetConnectionStructure(buffer, offset),
    } as ConnectionResponse;
}

export function HandleStat(buffer: Buffer) {
    if (buffer.length === 1) {
        return {
            success: false,
        } as StatResponse;
    }

    return {
        success: true,
        reads_per_minute: Number(read(buffer, 0, ValueSize.UInt64)),
        writes_per_minute: Number(read(buffer, 8, ValueSize.UInt64)),
        total_reads: Number(read(buffer, 16, ValueSize.UInt64)),
        total_writes: Number(read(buffer, 24, ValueSize.UInt64)),
    } as StatResponse;
}

export function HandleStatus(buffer: Buffer) {
    if (buffer.length !== 1) {
        throw new Error(`Invalid status response length: ${buffer.length}`);
    }
    return {
        success: buffer.at(0) === 0x01,
    } as StatusResponse;
}

export function HandleWhoAmI(buffer: Buffer) {
    return {
        success: buffer.at(0) === 0x01,
        id: buffer.subarray(1, 16).toString('hex'),
    };
}

export function HandleInfo(buffer: Buffer): InfoResponse {
    return {
        success: true,
        timestamp: Number(read(buffer, 0, ValueSize.UInt64)),
        total_requests: Number(read(buffer, 8, ValueSize.UInt64)),
        total_requests_per_minute: Number(read(buffer, 16, ValueSize.UInt64)),
        total_insert_requests: Number(read(buffer, 24, ValueSize.UInt64)),
        total_insert_requests_per_minute: Number(read(buffer, 32, ValueSize.UInt64)),
        total_query_requests: Number(read(buffer, 40, ValueSize.UInt64)),
        total_query_requests_per_minute: Number(read(buffer, 48, ValueSize.UInt64)),
        total_update_requests: Number(read(buffer, 56, ValueSize.UInt64)),
        total_update_requests_per_minute: Number(read(buffer, 64, ValueSize.UInt64)),
        total_purge_requests: Number(read(buffer, 72, ValueSize.UInt64)),
        total_purge_requests_per_minute: Number(read(buffer, 80, ValueSize.UInt64)),
        total_get_requests: Number(read(buffer, 88, ValueSize.UInt64)),
        total_get_requests_per_minute: Number(read(buffer, 96, ValueSize.UInt64)),
        total_set_requests: Number(read(buffer, 104, ValueSize.UInt64)),
        total_set_requests_per_minute: Number(read(buffer, 112, ValueSize.UInt64)),
        total_list_requests: Number(read(buffer, 120, ValueSize.UInt64)),
        total_list_requests_per_minute: Number(read(buffer, 128, ValueSize.UInt64)),
        total_info_requests: Number(read(buffer, 136, ValueSize.UInt64)),
        total_info_requests_per_minute: Number(read(buffer, 144, ValueSize.UInt64)),
        total_stats_requests: Number(read(buffer, 152, ValueSize.UInt64)),
        total_stats_requests_per_minute: Number(read(buffer, 160, ValueSize.UInt64)),
        total_stat_requests: Number(read(buffer, 168, ValueSize.UInt64)),
        total_stat_requests_per_minute: Number(read(buffer, 176, ValueSize.UInt64)),
        total_subscribe_requests: Number(read(buffer, 184, ValueSize.UInt64)),
        total_subscribe_requests_per_minute: Number(read(buffer, 192, ValueSize.UInt64)),
        total_unsubscribe_requests: Number(read(buffer, 200, ValueSize.UInt64)),
        total_unsubscribe_requests_per_minute: Number(read(buffer, 208, ValueSize.UInt64)),
        total_publish_requests: Number(read(buffer, 216, ValueSize.UInt64)),
        total_publish_requests_per_minute: Number(read(buffer, 224, ValueSize.UInt64)),
        total_channel_requests: Number(read(buffer, 232, ValueSize.UInt64)),
        total_channel_requests_per_minute: Number(read(buffer, 240, ValueSize.UInt64)),
        total_channels_requests: Number(read(buffer, 248, ValueSize.UInt64)),
        total_channels_requests_per_minute: Number(read(buffer, 256, ValueSize.UInt64)),
        total_whoami_requests: Number(read(buffer, 264, ValueSize.UInt64)),
        total_whoami_requests_per_minute: Number(read(buffer, 272, ValueSize.UInt64)),
        total_connection_requests: Number(read(buffer, 280, ValueSize.UInt64)),
        total_connection_requests_per_minute: Number(read(buffer, 288, ValueSize.UInt64)),
        total_connections_requests: Number(read(buffer, 296, ValueSize.UInt64)),
        total_connections_requests_per_minute: Number(read(buffer, 304, ValueSize.UInt64)),
        total_read_bytes: Number(read(buffer, 312, ValueSize.UInt64)),
        total_read_bytes_per_minute: Number(read(buffer, 320, ValueSize.UInt64)),
        total_write_bytes: Number(read(buffer, 328, ValueSize.UInt64)),
        total_write_bytes_per_minute: Number(read(buffer, 336, ValueSize.UInt64)),
        total_keys: Number(read(buffer, 344, ValueSize.UInt64)),
        total_counters: Number(read(buffer, 352, ValueSize.UInt64)),
        total_buffers: Number(read(buffer, 360, ValueSize.UInt64)),
        total_allocated_bytes_on_counters: Number(read(buffer, 368, ValueSize.UInt64)),
        total_allocated_bytes_on_buffers: Number(read(buffer, 376, ValueSize.UInt64)),
        total_subscriptions: Number(read(buffer, 384, ValueSize.UInt64)),
        total_channels: Number(read(buffer, 392, ValueSize.UInt64)),
        startup_timestamp: Number(read(buffer, 400, ValueSize.UInt64)),
        total_connections: Number(read(buffer, 408, ValueSize.UInt64)),
        version: buffer
            .subarray(416, 432)
            .toString()
            .replace(/\x00+$/, ''), // NOSONAR
    };
}
