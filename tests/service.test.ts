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
    FullResponse,
    RequestType,
    Service,
    SimpleResponse,
    TTLType,
    ValueSize,
} from '../src';
import {expect} from 'vitest';

describe('Service', () => {
    let service: Service;

    beforeAll(async () => {
        const size = process.env.THROTTR_SIZE ?? 'uint16';

        const value_size: ValueSize = {
            uint8: ValueSize.UInt8,
            uint16: ValueSize.UInt16,
            uint32: ValueSize.UInt32,
            uint64: ValueSize.UInt64,
        }[size] as ValueSize;

        service = new Service({
            host: '127.0.0.1',
            port: 9000,
            value_size: value_size,
        });
        await service.connect();
    });

    afterAll(() => {
        service.disconnect();
    });

    const flexNumber = (bigInt: boolean, number: number) => bigInt ? BigInt(number) : number; // NOSONAR

    it('it should be compatible with throttr server', async () => {
        const key = '333333';
        const isBigInt = process.env.THROTTR_SIZE === 'uint64';
        await new Promise(resolve => setTimeout(resolve, 1000)); // NOSONAR

        // We are going to make a INSERT with 7 as "Quota" and 60 seconds of "TTL" ...

        const insert = (await service.send({
            type: RequestType.Insert,
            key: key,
            quota: flexNumber(isBigInt, 7),
            ttl_type: TTLType.Seconds,
            ttl: flexNumber(isBigInt, 60),
        })) as SimpleResponse;

        expect(typeof insert.success).toBe('boolean');

        // And that should be accepted ...

        expect(insert.success).toBe(true);

        // After that, we are going to make a QUERY to see what was stored ...

        const first_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

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
        })) as SimpleResponse;

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
        })) as SimpleResponse;

        expect(typeof failed_decrease_update.success).toBe('boolean');

        // But that should fail ...

        expect(failed_decrease_update.success).toBe(false);

        // After that we're going to query to see how much "Quota" we have ...

        const empty_quota_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

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
        })) as SimpleResponse;

        expect(typeof success_patch_update.success).toBe('boolean');

        // And that should be fine ...

        expect(success_patch_update.success).toBe(true);

        // After that we're going to query to see how much "Quota" we have ...

        const patched_quota_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

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
        })) as SimpleResponse;

        expect(typeof success_increase_update.success).toBe('boolean');

        // And that should be fine ...

        expect(success_increase_update.success).toBe(true);

        // After that we're going to query to see how much "Quota" we have ...

        const increased_quota_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

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
        })) as SimpleResponse;

        expect(typeof success_increase_ttl.success).toBe('boolean');

        // And that should be fine ...

        expect(success_increase_ttl.success).toBe(true);

        // After that we're going to query to see how much "TTL" we have ...

        const increased_ttl_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

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
        })) as SimpleResponse;

        expect(typeof success_decrease_ttl.success).toBe('boolean');

        // And that should be fine ...

        expect(success_decrease_ttl.success).toBe(true);

        // After that we're going to query to see how much "TTL" we have ...

        const decrease_ttl_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

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
        })) as SimpleResponse;

        expect(typeof success_patch_ttl.success).toBe('boolean');

        // And that should be fine ...

        expect(success_patch_ttl.success).toBe(true);

        // After that we're going to query to see how much "TTL" we have ...

        const patch_ttl_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

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
        })) as SimpleResponse;

        expect(typeof success_purge.success).toBe('boolean');

        // And that should be fine ...

        expect(success_purge.success).toBe(true);

        // After that we're going to try again ...

        const failed_purge = (await service.send({
            type: RequestType.Purge,
            key: key,
        })) as SimpleResponse;

        expect(typeof failed_purge.success).toBe('boolean');

        // And that should fail ...

        expect(failed_purge.success).toBe(false);

        // After that we're going to query to see if key exists ...

        const exists_query = (await service.send({
            type: RequestType.Query,
            key: key,
        })) as FullResponse;

        expect(typeof exists_query.success).toBe('boolean');
        expect(typeof exists_query.quota).toMatch(/number|bigint/);
        expect(typeof exists_query.ttl).toMatch(/number|bigint/);
        expect(typeof exists_query.ttl_type).toBe('number');

        // And that should fail ...

        expect(exists_query.success).toBe(false);
    });


    it('should insert and query multiple keys in a single batch write', async () => {
        const isBigInt = process.env.THROTTR_SIZE === 'uint64';

        await new Promise(resolve => setTimeout(resolve, 1000)); // NOSONAR

        const key1 = 'batch-key-1';
        const key2 = 'batch-key-2';

        const [res1, res2] = await service.send([
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
        ]) as SimpleResponse[];

        expect(res1.success).toBe(true);
        expect(res2.success).toBe(true);

        const [query1, query2] = await service.send([
            {
                type: RequestType.Query,
                key: key1,
            },
            {
                type: RequestType.Query,
                key: key2,
            },
        ]) as FullResponse[];

        expect(query1.success).toBe(true);
        expect(query1.quota).toBe(flexNumber(isBigInt, 7));
        expect(query1.ttl_type).toBe(TTLType.Seconds);
        expect(query1.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));

        expect(query2.success).toBe(true);
        expect(query2.quota).toBe(flexNumber(isBigInt, 9));
        expect(query2.ttl_type).toBe(TTLType.Seconds);
        expect(query2.ttl).toBeGreaterThan(flexNumber(isBigInt, 0));
    });
});
