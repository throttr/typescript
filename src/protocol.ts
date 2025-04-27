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

import { isIPv4, isIPv6 } from "net";
import { Request, Response, IPBuffer } from "./types";

/**
 * Converts string IP address to IPBuffer
 *
 * @param ip
 * @constructor
 */
export function IPToBuffer(ip: string): IPBuffer {
    const buf = Buffer.alloc(16);

    if (isIPv4(ip)) {
        const parts = ip.split(".");
        parts.forEach((part, idx) => {
            buf[idx] = parseInt(part, 10);
        });
        return { version: 4, buffer: buf };
    }

    if (isIPv6(ip)) {
        const packed = ip.split(":").flatMap(block => {
            const num = parseInt(block || "0", 16);
            return [(num >> 8) & 0xff, num & 0xff];
        });

        const bytes = Buffer.from(packed);
        bytes.copy(buf, 0);
        return { version: 6, buffer: buf };
    }

    throw new Error("Invalid IP format");
}

/**
 * Build request
 *
 * @param request
 * @constructor
 */
export function BuildRequest(request: Request): Buffer {
    const urlBuf = Buffer.from(request.url, 'utf-8');
    const buffer = Buffer.alloc(28 + urlBuf.length);

    const { version, buffer: ipBuf } = IPToBuffer(request.ip);
    buffer.writeUInt8(version, 0);
    ipBuf.copy(buffer, 1);
    buffer.writeUInt16LE(request.port, 17);
    buffer.writeUInt32LE(request.max_requests, 19);
    buffer.writeUInt32LE(request.ttl, 23);
    buffer.writeUInt8(urlBuf.length, 27);
    urlBuf.copy(buffer, 28);

    return buffer;
}

/**
 * Parse response
 *
 * @param buffer
 * @constructor
 */
export function ParseResponse(buffer: Buffer): Response {
    if (buffer.length !== 13) {
        throw new Error("Invalid response size.");
    }

    const can = buffer.readUInt8(0) !== 0;
    const available_requests = buffer.readInt32LE(1);
    const ttl = buffer.readBigInt64LE(5);

    return {
        can,
        available_requests,
        ttl: Number(ttl),
    };
}
