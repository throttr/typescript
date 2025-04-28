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

import { describe, it, expect } from "vitest";
import { serializeRequest, parseResponse } from "../src/utils";
import { Request } from "../src";

describe('Utils', () => {
    it('should throw error on unsupported request type', () => {
        const fakeRequest = { type: 99 } as unknown as Request;
        expect(() => serializeRequest(fakeRequest)).toThrowError('Unsupported request type');
    });

    it('should throw error on invalid full response length', () => {
        const invalidBuffer = Buffer.alloc(17); // debería ser 18
        expect(() => parseResponse(invalidBuffer, 'full')).toThrowError(/Invalid full response length/);
    });

    it('should throw error on invalid simple response length', () => {
        const invalidBuffer = Buffer.alloc(2); // debería ser 1
        expect(() => parseResponse(invalidBuffer, 'simple')).toThrowError(/Invalid simple response length/);
    });
});
