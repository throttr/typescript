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

import { Service, RequestType, TTLType, AttributeType, ChangeType, FullResponse, SimpleResponse } from "../src";

describe('Service', () => {
    let service: Service;

    beforeAll(async () => {
        service = new Service({
            host: "127.0.0.1",
            port: 9000,
        });
        await service.connect();
    });

    afterAll(() => {
        service.disconnect();
    });

    it('should insert and query successfully', async () => {
        const consumerId = "user:123";
        const resourceId = "/api/test";

        const insert = await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(5),
            usage: BigInt(0),
            ttl_type: TTLType.Seconds,
            ttl: BigInt(5),
        }) as FullResponse;

        expect(insert.allowed).toBe(true);

        const query = await service.send({
            type: RequestType.Query,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as FullResponse;

        expect(query.allowed).toBe(true);
        expect(typeof query.quota_remaining).toBe("bigint");
        expect(typeof query.ttl_remaining).toBe("bigint");
    });

    it('should consume quota via Insert usage and deny after exhausted', async () => {
        const consumerId = "user:consume-insert";
        const resourceId = "/api/consume-insert";

        await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(2),
            usage: BigInt(0),
            ttl_type: TTLType.Seconds,
            ttl: BigInt(5),
        });

        // Primer consumo
        const first = await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(0),
            usage: BigInt(1),
            ttl_type: TTLType.Seconds,
            ttl: BigInt(5),
        }) as FullResponse;

        expect(first.allowed).toBe(true);

        // Segundo consumo
        const second = await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(0),
            usage: BigInt(1),
            ttl_type: TTLType.Seconds,
            ttl: BigInt(5),
        }) as FullResponse;

        expect(second.allowed).toBe(true);

        // Ya debería estar agotado, pero Insert igual puede aceptar, vamos a verificar la cuota
        const query = await service.send({
            type: RequestType.Query,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as FullResponse;

        expect(query.quota_remaining <= BigInt(0)).toBe(true);
    });

    it('should consume quota via Update decrease and quota reach zero', async () => {
        const consumerId = "user:consume-update";
        const resourceId = "/api/consume-update";

        await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(2),
            usage: BigInt(0),
            ttl_type: TTLType.Seconds,
            ttl: BigInt(5),
        });

        // Decrease 1
        const firstUpdate = await service.send({
            type: RequestType.Update,
            attribute: AttributeType.Quota,
            change: ChangeType.Decrease,
            value: BigInt(1),
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as SimpleResponse;

        expect(firstUpdate.success).toBe(true);

        // Decrease 1
        const secondUpdate = await service.send({
            type: RequestType.Update,
            attribute: AttributeType.Quota,
            change: ChangeType.Decrease,
            value: BigInt(1),
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as SimpleResponse;

        expect(secondUpdate.success).toBe(true);

        // Decrease 1 más
        const thirdUpdate = await service.send({
            type: RequestType.Update,
            attribute: AttributeType.Quota,
            change: ChangeType.Decrease,
            value: BigInt(1),
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as SimpleResponse;

        expect(thirdUpdate.success).toBe(true);

        // Ahora consultamos y verificamos cuota
        const query = await service.send({
            type: RequestType.Query,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as FullResponse;

        expect(query.quota_remaining <= BigInt(0)).toBe(true);
    });

    it('should purge and fail to query afterwards', async () => {
        const consumerId = "user:purge";
        const resourceId = "/api/purge";

        await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(1),
            usage: BigInt(0),
            ttl_type: TTLType.Seconds,
            ttl: BigInt(5),
        });

        const purge = await service.send({
            type: RequestType.Purge,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as SimpleResponse;

        expect(purge.success).toBe(true);

        const query = await service.send({
            type: RequestType.Query,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as FullResponse;

        expect(query.allowed).toBe(false);
    });

    it('should reset quota after TTL expiration', async () => {
        const consumerId = "user:ttl";
        const resourceId = "/api/ttl";

        await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(1),
            usage: BigInt(1),
            ttl_type: TTLType.Seconds,
            ttl: BigInt(2),
        });

        const queryAfterInsert = await service.send({
            type: RequestType.Query,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as FullResponse;

        expect(queryAfterInsert.quota_remaining <= BigInt(0)).toBe(true);

        await new Promise((resolve) => setTimeout(resolve, 2500)); // Esperar que TTL expire

        const queryAfterTTL = await service.send({
            type: RequestType.Query,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as FullResponse;

        expect(queryAfterTTL.allowed).toBe(false);
    });

    it('should TTL type be equals to the TTL assigned', async () => {
        const consumerId = "user:ttl-type";
        const resourceId = "/api/ttl-type";

        await service.send({
            type: RequestType.Insert,
            consumer_id: consumerId,
            resource_id: resourceId,
            quota: BigInt(1),
            usage: BigInt(1),
            ttl_type: TTLType.Nanoseconds,
            ttl: BigInt(100000000),
        });

        const query = await service.send({
            type: RequestType.Query,
            consumer_id: consumerId,
            resource_id: resourceId,
        }) as FullResponse;

        expect(query.ttl_type).toBe(TTLType.Nanoseconds);
    });
});
