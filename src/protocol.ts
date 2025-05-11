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

import {Request, RequestType, ResponseType, ValueSize} from './types';
import {parseResponse, serializeRequest} from './utils';

/**
 * Build request
 *
 * @param request
 */
export const BuildRequest = serializeRequest;

/**
 * Parse response
 *
 * @param buffer
 * @param expected
 * @param value_size
 */
export function ParseResponse(buffer: Buffer, expected: ResponseType, value_size: ValueSize) {
    return parseResponse(buffer, expected, value_size);
}

/**
 * Get expected response type
 *
 * @param request
 */
export function GetExpectedResponseType(request: Request): ResponseType {
    switch (request.type) {
        case RequestType.Update:
        case RequestType.Purge:
        case RequestType.Insert:
        case RequestType.Set:
            return 'status';
        case RequestType.Query:
            return 'query';
        case RequestType.Get:
            return 'get';
        /* c8 ignore start */
        default:
            throw new Error('Unknown request type');
        /* c8 ignore stop */
    }
}
