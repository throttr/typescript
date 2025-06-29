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
    AttributeType,
    ChangeType,
    QueryResponse,
    RequestType,
    Service,
    StatusResponse,
    TTLType,
    ValueSize,
    GetResponse,
} from '../src';
import { expect } from 'vitest';
import {
    ChannelResponse,
    ChannelsResponse,
    ConnectionResponse,
    ConnectionsResponse,
    InfoResponse,
    KeyType,
    ListResponse,
    StatResponse,
    StatsResponse,
    WhoAmIResponse,
} from '../src/types';

const prepareService = async () => {
    const size = process.env.THROTTR_SIZE ?? 'uint16';

    const value_size: ValueSize = {
        uint8: ValueSize.UInt8,
        uint16: ValueSize.UInt16,
        uint32: ValueSize.UInt32,
        uint64: ValueSize.UInt64,
    }[size] as ValueSize;

    let service: Service = new Service({
        host: '127.0.0.1',
        port: 9000,
        value_size: value_size,
        max_connections: 4,
    });

    await service.connect();

    return service;
};

describe('Service', () => {
    const flexNumber = (bigInt: boolean, number: number) => (bigInt ? BigInt(number) : number); // NOSONAR

    it('it should be compatible with throttr server', async () => {
        const service = await prepareService();
        const key = '7777777';
        const isBigInt = process.env.THROTTR_SIZE === 'uint64';

        // We are going to make a INSERT with 7 as "Quota" and 60 seconds of "TTL" ...

        const insert = (await service.send({
            type: RequestType.Insert,
            key: key,
            quota: flexNumber(isBigInt, 7),
            ttl_type: TTLType.Seconds,
            ttl: flexNumber(isBigInt, 60),
        })) as StatusResponse;

        expect(typeof insert.success).toBe('boolean');

        // And that should be accepted ...

        expect(insert.success).toBe(true);

        // After that, we are going to make a QUERY to see what was stored ...

        const first_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof first_query.success).toBe('boolean');
        expect(typeof first_query.quota).toMatch(/number|bigint/);
        expect(typeof first_query.ttl).toMatch(/number|bigint/);
        expect(typeof first_query.ttl_type).toBe('number');

        // And that must be stored ...

        expect(first_query.success).toBe(true);
        expect(first_query.quota).toBe(flexNumber(isBigInt, 7));
        expect(first_query.ttl_type).toBe(TTLType.Seconds);
        expect(first_query.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));
        expect(first_query.ttl).toBeLessThan(flexNumber(isBigInt, 60));

        // Right now we will UPDATE the quota to zero using "decrease" operation ...

        const success_decrease_update = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.Quota,
            change: ChangeType.Decrease,
            value: flexNumber(isBigInt, 7),
        })) as StatusResponse;

        expect(typeof success_decrease_update.success).toBe('boolean');

        // And that should be fine ...

        expect(success_decrease_update.success).toBe(true);

        // After that we're going to check if we can "decrease" again ...

        const failed_decrease_update = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.Quota,
            change: ChangeType.Decrease,
            value: flexNumber(isBigInt, 7),
        })) as StatusResponse;

        expect(typeof failed_decrease_update.success).toBe('boolean');

        // But that should fail ...

        expect(failed_decrease_update.success).toBe(false);

        // After that we're going to query to see how much "Quota" we have ...

        const empty_quota_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof empty_quota_query.success).toBe('boolean');
        expect(typeof empty_quota_query.quota).toMatch(/number|bigint/);
        expect(typeof empty_quota_query.ttl).toMatch(/number|bigint/);
        expect(typeof empty_quota_query.ttl_type).toBe('number');

        // And "Quota" should be zero ...

        expect(empty_quota_query.success).toBe(true);
        expect(empty_quota_query.quota).toBe(flexNumber(isBigInt, 0));
        expect(empty_quota_query.ttl_type).toBe(TTLType.Seconds);
        expect(empty_quota_query.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));
        expect(empty_quota_query.ttl).toBeLessThan(flexNumber(isBigInt, 60));

        // After that we're going to UPDATE to "patch" the "Quota" to 10 ...

        const success_patch_update = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.Quota,
            change: ChangeType.Patch,
            value: flexNumber(isBigInt, 10),
        })) as StatusResponse;

        expect(typeof success_patch_update.success).toBe('boolean');

        // And that should be fine ...

        expect(success_patch_update.success).toBe(true);

        // After that we're going to query to see how much "Quota" we have ...

        const patched_quota_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof patched_quota_query.success).toBe('boolean');
        expect(typeof patched_quota_query.quota).toMatch(/number|bigint/);
        expect(typeof patched_quota_query.ttl).toMatch(/number|bigint/);
        expect(typeof patched_quota_query.ttl_type).toBe('number');

        // And "Quota" should be ten ...

        expect(patched_quota_query.success).toBe(true);
        expect(patched_quota_query.quota).toBe(flexNumber(isBigInt, 10));
        expect(patched_quota_query.ttl_type).toBe(TTLType.Seconds);
        expect(patched_quota_query.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));
        expect(patched_quota_query.ttl).toBeLessThan(flexNumber(isBigInt, 60));

        // After that we're going to UPDATE to "increase" the "Quota" by 20 ...

        const success_increase_update = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.Quota,
            change: ChangeType.Increase,
            value: flexNumber(isBigInt, 20),
        })) as StatusResponse;

        expect(typeof success_increase_update.success).toBe('boolean');

        // And that should be fine ...

        expect(success_increase_update.success).toBe(true);

        // After that we're going to query to see how much "Quota" we have ...

        const increased_quota_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof increased_quota_query.success).toBe('boolean');
        expect(typeof increased_quota_query.quota).toMatch(/number|bigint/);
        expect(typeof increased_quota_query.ttl).toMatch(/number|bigint/);
        expect(typeof increased_quota_query.ttl_type).toBe('number');

        // And "Quota" should be thirty ...

        expect(increased_quota_query.success).toBe(true);
        expect(increased_quota_query.quota).toBe(flexNumber(isBigInt, 30));
        expect(increased_quota_query.ttl_type).toBe(TTLType.Seconds);
        expect(increased_quota_query.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));
        expect(increased_quota_query.ttl).toBeLessThan(flexNumber(isBigInt, 60));

        // After that we're going to UPDATE to "increase" the "TTL" by 60 ...

        const success_increase_ttl = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.TTL,
            change: ChangeType.Increase,
            value: flexNumber(isBigInt, 60),
        })) as StatusResponse;

        expect(typeof success_increase_ttl.success).toBe('boolean');

        // And that should be fine ...

        expect(success_increase_ttl.success).toBe(true);

        // After that we're going to query to see how much "TTL" we have ...

        const increased_ttl_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof increased_ttl_query.success).toBe('boolean');
        expect(typeof increased_ttl_query.quota).toMatch(/number|bigint/);
        expect(typeof increased_ttl_query.ttl).toMatch(/number|bigint/);
        expect(typeof increased_ttl_query.ttl_type).toBe('number');

        // And "TTL" should be less than one hundred twenty and more than sixty ...

        expect(increased_ttl_query.success).toBe(true);
        expect(increased_ttl_query.quota).toBe(flexNumber(isBigInt, 30));
        expect(increased_ttl_query.ttl_type).toBe(TTLType.Seconds);
        expect(increased_ttl_query.ttl).toBeGreaterThan(flexNumber(isBigInt, 60));
        expect(increased_ttl_query.ttl).toBeLessThan(flexNumber(isBigInt, 120));

        // After that we're going to UPDATE to "decrease" the "TTL" by 60 ...

        const success_decrease_ttl = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.TTL,
            change: ChangeType.Decrease,
            value: flexNumber(isBigInt, 60),
        })) as StatusResponse;

        expect(typeof success_decrease_ttl.success).toBe('boolean');

        // And that should be fine ...

        expect(success_decrease_ttl.success).toBe(true);

        // After that we're going to query to see how much "TTL" we have ...

        const decrease_ttl_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof decrease_ttl_query.success).toBe('boolean');
        expect(typeof decrease_ttl_query.quota).toMatch(/number|bigint/);
        expect(typeof decrease_ttl_query.ttl).toMatch(/number|bigint/);
        expect(typeof decrease_ttl_query.ttl_type).toBe('number');

        // And "TTL" should be less than sixty ...

        expect(decrease_ttl_query.success).toBe(true);
        expect(decrease_ttl_query.quota).toBe(flexNumber(isBigInt, 30));
        expect(decrease_ttl_query.ttl_type).toBe(TTLType.Seconds);
        expect(decrease_ttl_query.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));
        expect(decrease_ttl_query.ttl).toBeLessThan(flexNumber(isBigInt, 60));

        // After that we're going to UPDATE to "patch" the "TTL" to 90 ...

        const success_patch_ttl = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.TTL,
            change: ChangeType.Patch,
            value: flexNumber(isBigInt, 90),
        })) as StatusResponse;

        expect(typeof success_patch_ttl.success).toBe('boolean');

        // And that should be fine ...

        expect(success_patch_ttl.success).toBe(true);

        // After that we're going to query to see how much "TTL" we have ...

        const patch_ttl_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof patch_ttl_query.success).toBe('boolean');
        expect(typeof patch_ttl_query.quota).toMatch(/number|bigint/);
        expect(typeof patch_ttl_query.ttl).toMatch(/number|bigint/);
        expect(typeof patch_ttl_query.ttl_type).toBe('number');

        // And "TTL" should be less than ninety ...

        expect(patch_ttl_query.success).toBe(true);
        expect(patch_ttl_query.quota).toBe(flexNumber(isBigInt, 30));
        expect(patch_ttl_query.ttl_type).toBe(TTLType.Seconds);
        expect(patch_ttl_query.ttl).toBeGreaterThan(flexNumber(isBigInt, 60));
        expect(patch_ttl_query.ttl).toBeLessThan(flexNumber(isBigInt, 90));

        // After that we're going to purge the key ...

        const success_purge = (await service.send({
            type: RequestType.Purge,
            key: key,
        })) as StatusResponse;

        expect(typeof success_purge.success).toBe('boolean');

        // And that should be fine ...

        expect(success_purge.success).toBe(true);

        // After that we're going to try again ...

        const failed_purge = (await service.send({
            type: RequestType.Purge,
            key: key,
        })) as StatusResponse;

        expect(typeof failed_purge.success).toBe('boolean');

        // And that should fail ...

        expect(failed_purge.success).toBe(false);

        // After that we're going to query to see if key exists ...

        const exists_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as QueryResponse;

        expect(typeof exists_query.success).toBe('boolean');
        expect(typeof exists_query.quota).toMatch(/number|bigint/);
        expect(typeof exists_query.ttl).toMatch(/number|bigint/);
        expect(typeof exists_query.ttl_type).toBe('number');

        // And that should fail ...

        expect(exists_query.success).toBe(false);

        await service.disconnect();
    });

    it('should set and get values from the memory', async () => {
        const service = await prepareService();

        const key = 'in-memory';

        // After that we're going to set something in memory

        const set = (await service.send({
            type: RequestType.Set,
            key: key,
            ttl_type: TTLType.Seconds,
            ttl: 30,
            value: 'EHLO',
        })) as StatusResponse;

        expect(set.success).toBe(true);

        // After that we're going to get that key ...

        const get = (await service.send({
            type: RequestType.Get,
            key: key,
        })) as GetResponse;

        expect(typeof get.success).toBe('boolean');
        expect(typeof get.value).toMatch(/string/);
        expect(get.value).toBe('EHLO');

        // After that we're going to purge the key ...

        const success_purge = (await service.send({
            type: RequestType.Purge,
            key: key,
        })) as StatusResponse;

        expect(typeof success_purge.success).toBe('boolean');

        // And that should be fine ...

        expect(success_purge.success).toBe(true);

        // After that we're going to check if key has been purged ...

        const check = (await service.send({
            type: RequestType.Get,
            key: key,
        })) as GetResponse;

        expect(typeof check.success).toBe('boolean');
        expect(check.success).toBe(false);

        await service.disconnect();
    });

    it('should insert and query multiple keys in a single batch write', async () => {
        const service = await prepareService();
        const isBigInt = process.env.THROTTR_SIZE === 'uint64';

        const key1 = 'batch-key-1';
        const key2 = 'batch-key-2';

        const [res1, res2] = (await service.send([
            {
                type: RequestType.Insert,
                key: key1,
                quota: flexNumber(isBigInt, 7),
                ttl_type: TTLType.Seconds,
                ttl: flexNumber(isBigInt, 60),
            },
            {
                type: RequestType.Insert,
                key: key2,
                quota: flexNumber(isBigInt, 9),
                ttl_type: TTLType.Seconds,
                ttl: flexNumber(isBigInt, 30),
            },
        ])) as StatusResponse[];

        expect(res1.success).toBe(true);
        expect(res2.success).toBe(true);

        const [query1, query2] = (await service.send([
            {
                type: RequestType.Query,
                key: key1,
            },
            {
                type: RequestType.Query,
                key: key2,
            },
        ])) as QueryResponse[];

        expect(query1.success).toBe(true);
        expect(query1.quota).toBe(flexNumber(isBigInt, 7));
        expect(query1.ttl_type).toBe(TTLType.Seconds);
        expect(query1.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));

        expect(query2.success).toBe(true);
        expect(query2.quota).toBe(flexNumber(isBigInt, 9));
        expect(query2.ttl_type).toBe(TTLType.Seconds);
        expect(query2.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));

        const list = (await service.send({
            type: RequestType.List,
        })) as ListResponse;

        expect(list.keys.length).toBe(2);
        expect(list.keys[0].key).toBe('batch-key-1');
        expect(list.keys[1].key).toBe('batch-key-2');
        expect(list.keys[0].key_length).toBe(11);
        expect(list.keys[1].key_length).toBe(11);
        expect(list.keys[0].key_type).toBe(KeyType.Counter);
        expect(list.keys[1].key_type).toBe(KeyType.Counter);
        expect(list.keys[0].ttl_type).toBe(TTLType.Seconds);
        expect(list.keys[1].ttl_type).toBe(TTLType.Seconds);
        expect(list.keys[0].expires_at).toBeGreaterThan(0);
        expect(list.keys[1].expires_at).toBeGreaterThan(0);
        expect(list.keys[0].bytes_used).toBeGreaterThanOrEqual(1);
        expect(list.keys[1].bytes_used).toBeGreaterThanOrEqual(1);

        const info = (await service.send({
            type: RequestType.Info,
        })) as InfoResponse;

        expect(info.success).toBe(true);

        const stat = (await service.send({
            type: RequestType.Stat,
            key: 'batch-key-1',
        })) as StatResponse;

        expect(stat.success).toBe(true);
        expect(stat.reads_per_minute).toBeGreaterThanOrEqual(0);
        expect(stat.writes_per_minute).toBeGreaterThanOrEqual(0);
        expect(stat.total_reads).toBeGreaterThanOrEqual(0);
        expect(stat.total_writes).toBeGreaterThanOrEqual(0);

        const failed_stat = (await service.send({
            type: RequestType.Stat,
            key: 'batch-key-10',
        })) as StatResponse;

        expect(failed_stat.success).toBe(false);

        const stats = (await service.send({
            type: RequestType.Stats,
        })) as StatsResponse;

        expect(stats.keys.length).toBe(2);
        expect(stats.keys[0].key).toBe('batch-key-1');
        expect(stats.keys[1].key).toBe('batch-key-2');
        expect(stats.keys[0].key_length).toBe(11);
        expect(stats.keys[1].key_length).toBe(11);
        expect(stats.keys[0].reads_per_minute).toBeGreaterThanOrEqual(0);
        expect(stats.keys[1].reads_per_minute).toBeGreaterThanOrEqual(0);
        expect(stats.keys[0].writes_per_minute).toBeGreaterThanOrEqual(0);
        expect(stats.keys[1].writes_per_minute).toBeGreaterThanOrEqual(0);
        expect(stats.keys[0].total_reads).toBeGreaterThanOrEqual(0);
        expect(stats.keys[1].total_reads).toBeGreaterThanOrEqual(0);
        expect(stats.keys[0].total_writes).toBeGreaterThanOrEqual(0);
        expect(stats.keys[1].total_writes).toBeGreaterThanOrEqual(0);

        const connection_item = await service.getConnection();

        connection_item.setOnBroadcastCallback((data: string) => {
            expect(data).toBe('BCAST');
        });

        connection_item.setOnReceiveCallback((data: string) => {
            expect(data).toBe('RCV');
        });

        const subscribe = (await connection_item.send({
            type: RequestType.Subscribe,
            channel: 'my-channel',
            callback: (data: string) => {
                expect(data).toBe('EHLO');
            },
        })) as StatusResponse;
        //
        expect(subscribe.success).toBe(true);

        const success_publish = (await service.send({
            type: RequestType.Publish,
            channel: 'my-channel',
            value: 'EHLO',
        })) as StatusResponse;

        expect(success_publish.success).toBe(true);

        const success_broadcast = (await service.send({
            type: RequestType.Publish,
            channel: '*',
            value: 'BCAST',
        })) as StatusResponse;

        expect(success_broadcast.success).toBe(true);

        const success_receive = (await service.send({
            type: RequestType.Publish,
            channel: connection_item.id,
            value: 'RCV',
        })) as StatusResponse;

        expect(success_receive.success).toBe(true);

        const unsubscribe = (await connection_item.send({
            type: RequestType.Unsubscribe,
            channel: 'my-channel',
        })) as StatusResponse;

        expect(unsubscribe.success).toBe(true);

        const failed_publish = (await service.send({
            type: RequestType.Publish,
            channel: 'my-channel',
            value: 'EHLO',
        })) as StatusResponse;

        expect(failed_publish.success).toBe(false);

        const connections = (await service.send({
            type: RequestType.Connections,
        })) as ConnectionsResponse;

        const id = connections.connections[0].id;

        const connection = (await service.send({
            type: RequestType.Connection,
            id: id,
        })) as ConnectionResponse;

        expect(connection.success).toBe(true);

        const failed_connection = (await service.send({
            type: RequestType.Connection,
            id: 'daa6f9fd874e410582ba8e3fe5b5674b',
        })) as ConnectionResponse;

        expect(failed_connection.success).toBe(false);

        const channels = (await service.send({
            type: RequestType.Channels,
        })) as ChannelsResponse;

        expect(channels.success).toBe(true);

        const channel = (await service.send({
            type: RequestType.Channel,
            channel: '*',
        })) as ChannelResponse;

        expect(channel.success).toBe(true);

        const failed_channel = (await service.send({
            type: RequestType.Channel,
            channel: 'doesnt_exists',
        })) as ChannelResponse;

        expect(failed_channel.success).toBe(false);

        const whoami = (await service.send({
            type: RequestType.WhoAmI,
        })) as WhoAmIResponse;

        expect(whoami.success).toBe(true);

        await service.disconnect();
    });
});
