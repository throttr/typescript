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

    it('should connect and send a request and receive expected values', async () => {
        const request = {
            ip: "127.0.0.1",
            port: 9000,
            url: "/test",
            max_requests: 5,
            ttl: 10000,
        };

        const response = await service.send(request);

        expect(typeof response.can).toBe("boolean");
        expect(typeof response.available_requests).toBe("number");
        expect(typeof response.ttl).toBe("number");

        expect(response.can).toBe(true);
        expect(response.available_requests).toBe(4);
        expect(response.ttl).toBeGreaterThan(0);
    });
});
