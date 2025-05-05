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

import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {Connection} from "../src/connection";
import {RequestType, ValueSize} from "../src";

describe('Connection', () => {
    let connection: Connection;

    beforeAll(async () => {
        connection = new Connection("127.0.0.1", 9000, ValueSize.UInt16);
        await connection.connect();
    });

    afterAll(() => {
        connection.disconnect();
    });

    it('should handle socket error correctly', async () => {
        const sendPromise = connection.send({
            type: RequestType.Query,
            key: "abc",
        });

        // Forzar un error manualmente
        connection['socket'].emit('error', new Error('Simulated error'));

        await expect(sendPromise).rejects.toThrow('Simulated error');
    });

    it('should handle data without current request', () => {
        connection['current'] = undefined;
        expect(() => {
            connection['handleData'](Buffer.from([0x00]));
        }).not.toThrow();
    });

    it('should disconnect and remove all listeners', async () => {
        const tempConnection = new Connection("127.0.0.1", 9000, ValueSize.UInt8);
        await tempConnection.connect();
        tempConnection.disconnect();

        expect(tempConnection['socket'].listenerCount('data')).toBe(0);
        expect(tempConnection['socket'].listenerCount('error')).toBe(0);
    });
});
