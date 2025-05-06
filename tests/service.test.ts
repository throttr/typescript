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
import { expect } from 'vitest';

describe('Service', () => {
    let service: Service;

    beforeAll(async () => {
        service = new Service({
            host: '127.0.0.1',
            port: 9000,
            value_size: ValueSize.UInt16,
        });
        await service.connect();
    });

    afterAll(() => {
        service.disconnect();
    });

    it('it should be compatible with throttr server', async () => {
        const key = '333333';

        // We are going to make a INSERT with 7 as "Quota" and 60 seconds of "TTL" ...

        const insert = (await service.send({
            type: RequestType.Insert,
            key: key,
            quota: 7,
            ttl_type: TTLType.Seconds,
            ttl: 60,
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
        expect(typeof first_query.quota).toBe('number');
        expect(typeof first_query.ttl).toBe('number');
        expect(typeof first_query.ttl_type).toBe('number');

        // And that must be stored ...

        expect(first_query.success).toBe(true);
        expect(first_query.quota).toBe(7);
        expect(first_query.ttl_type).toBe(TTLType.Seconds);
        expect(first_query.ttl).toBeGreaterThan(0);
        expect(first_query.ttl).toBeLessThan(60);

        // Right now we will UPDATE the quota to zero using "decrease" operation ...

        const success_decrease_update = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.Quota,
            change: ChangeType.Decrease,
            value: 7,
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
            value: 7,
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
        expect(typeof empty_quota_query.quota).toBe('number');
        expect(typeof empty_quota_query.ttl).toBe('number');
        expect(typeof empty_quota_query.ttl_type).toBe('number');

        // And "Quota" should be zero ...

        expect(empty_quota_query.success).toBe(true);
        expect(empty_quota_query.quota).toBe(0);
        expect(empty_quota_query.ttl_type).toBe(TTLType.Seconds);
        expect(empty_quota_query.ttl).toBeGreaterThan(0);
        expect(empty_quota_query.ttl).toBeLessThan(60);

        // After that we're going to UPDATE to "patch" the "Quota" to 10 ...

        const success_patch_update = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.Quota,
            change: ChangeType.Patch,
            value: 10,
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
        expect(typeof patched_quota_query.quota).toBe('number');
        expect(typeof patched_quota_query.ttl).toBe('number');
        expect(typeof patched_quota_query.ttl_type).toBe('number');

        // And "Quota" should be ten ...

        expect(patched_quota_query.success).toBe(true);
        expect(patched_quota_query.quota).toBe(10);
        expect(patched_quota_query.ttl_type).toBe(TTLType.Seconds);
        expect(patched_quota_query.ttl).toBeGreaterThan(0);
        expect(patched_quota_query.ttl).toBeLessThan(60);

        // After that we're going to UPDATE to "increase" the "Quota" by 20 ...

        const success_increase_update = (await service.send({
            type: RequestType.Update,
            key: key,
            attribute: AttributeType.Quota,
            change: ChangeType.Increase,
            value: 20,
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
        expect(typeof increased_quota_query.quota).toBe('number');
        expect(typeof increased_quota_query.ttl).toBe('number');
        expect(typeof increased_quota_query.ttl_type).toBe('number');

        // And "Quota" should be thirty ...

        expect(increased_quota_query.success).toBe(true);
        expect(increased_quota_query.quota).toBe(30);
        expect(increased_quota_query.ttl_type).toBe(TTLType.Seconds);
        expect(increased_quota_query.ttl).toBeGreaterThan(0);
        expect(increased_quota_query.ttl).toBeLessThan(60);

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
        expect(typeof exists_query.quota).toBe('number');
        expect(typeof exists_query.ttl).toBe('number');
        expect(typeof exists_query.ttl_type).toBe('number');

        // And that should fail ...

        expect(exists_query.success).toBe(false);
    }, {
        timeout: 30000
    });
});
