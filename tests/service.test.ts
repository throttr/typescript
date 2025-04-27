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

import { Service } from "../src";

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

    it('should connect, send something and receive a valid format', async () => {
        const request = {
            ip: "127.0.0.1",
            port: 9000,
            url: "POST /api/validate",
            max_requests: 1,
            ttl: 1000,
        };

        const response = await service.send(request);

        expect(typeof response.can).toBe("boolean");
        expect(typeof response.available_requests).toBe("number");
        expect(typeof response.ttl).toBe("number");
    });

    it('should connect and send a requests until server respond unavailable', async () => {
        const request = {
            ip: "127.0.0.1",
            port: 9000,
            url: "POST /api/auth",
            max_requests: 5,
            ttl: 5000,
        };

        for (let i = 5; i > 0; i--) {
            const response = await service.send(request);

            expect(response.can).toBe(true);
            expect(response.available_requests).toBe(i - 1);
            expect(response.ttl).toBeGreaterThan(0);
        }

        const response = await service.send(request);

        expect(response.can).toBe(false);
        expect(response.available_requests).toBe(0);
        expect(response.ttl).toBeGreaterThan(0);
    });

    it('should reset available requests after TTL expires', async () => {
        const request = {
            ip: "127.0.0.1",
            port: 9000,
            url: "POST /api/refresh",
            max_requests: 2,
            ttl: 2000, // 2 segundos
        };

        await service.send(request);
        await service.send(request);

        const denied = await service.send(request);
        expect(denied.can).toBe(false);

        await new Promise(resolve => setTimeout(resolve, 2500));

        const refreshed = await service.send(request);
        expect(refreshed.can).toBe(true);
        expect(refreshed.available_requests).toBe(1);
    });

    it('should maintain separate counters for different URLs', async () => {
        const baseRequest = {
            ip: "127.0.0.1",
            port: 9000,
            max_requests: 3,
            ttl: 5000,
        };

        const authRequest = { ...baseRequest, url: "POST /api/v1/auth" };
        const userRequest = { ...baseRequest, url: "POST /api/v1/user" };

        const response1 = await service.send(authRequest);
        const response2 = await service.send(userRequest);

        expect(response1.can).toBe(true);
        expect(response2.can).toBe(true);

        expect(response1.available_requests).toBe(2);
        expect(response2.available_requests).toBe(2);
    });

    it('should maintain separate counters for different IPs', async () => {
        const baseRequest = {
            port: 9000,
            url: "POST /api/iptest",
            max_requests: 2,
            ttl: 3000,
        };

        const requestLocalhost = { ...baseRequest, ip: "127.0.0.1" };
        const requestAnotherIP = { ...baseRequest, ip: "127.0.0.2" };

        const response1 = await service.send(requestLocalhost);
        const response2 = await service.send(requestAnotherIP);

        expect(response1.can).toBe(true);
        expect(response2.can).toBe(true);

        expect(response1.available_requests).toBe(1);
        expect(response2.available_requests).toBe(1);
    });

    it('should continue denying after available_requests reach 0', async () => {
        const request = {
            ip: "127.0.0.1",
            port: 9000,
            url: "POST /api/block",
            max_requests: 1,
            ttl: 4000,
        };

        const first = await service.send(request);
        expect(first.can).toBe(true);
        expect(first.available_requests).toBe(0);

        const second = await service.send(request);
        expect(second.can).toBe(false);

        const third = await service.send(request);
        expect(third.can).toBe(false);
    });

    it('should handle IPv6 request with localhost', async () => {
        const request = {
            ip: "::1",
            port: 9000,
            url: "POST /api/ipv6",
            max_requests: 3,
            ttl: 5000,
        };

        const response = await service.send(request);

        expect(response.can).toBe(true);
        expect(response.available_requests).toBe(2);
        expect(response.ttl).toBeGreaterThan(0);
    });

    it('should throw an error for invalid IP format', async () => {
        const request = {
            ip: "invalid",
            port: 9000,
            url: "POST /api/fail",
            max_requests: 1,
            ttl: 5000,
        };

        await expect(service.send(request)).rejects.toThrowError("Invalid IP format");
    });
});
