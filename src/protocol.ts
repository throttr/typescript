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
    HandleChannel,
    HandleChannels,
    HandleConnection,
    HandleConnections,
    HandleGet,
    HandleInfo,
    HandleList,
    HandleQuery,
    HandleStat,
    HandleStats,
    HandleStatus,
    HandleWhoAmI,
} from './handlers';
import { Request, RequestType, ResponseType, TTLType, ValueSize } from './types';
import {
    BuildForConnection,
    BuildForInsert,
    BuildForPublishEvent,
    BuildForQueryGetPurgeStat,
    BuildForSet,
    BuildForStatus,
    BuildForSubscribeUnsubscribeChannel,
    BuildForUpdate,
} from './builders';

/**
 * Build request
 *
 * @param request
 * @param value_size
 */
export const BuildRequest = (request: Request, value_size: ValueSize): Buffer => {
    switch (request.type) {
        case RequestType.Insert:
            return BuildForInsert(request, value_size);

        case RequestType.Set:
            return BuildForSet(request, value_size);

        case RequestType.Query:
        case RequestType.Get:
        case RequestType.Purge:
        case RequestType.Stat:
            return BuildForQueryGetPurgeStat(request);

        case RequestType.Subscribe:
        case RequestType.Unsubscribe:
        case RequestType.Channel:
            return BuildForSubscribeUnsubscribeChannel(request);

        case RequestType.Connection:
            return BuildForConnection(request);

        case RequestType.Publish:
        case RequestType.Event:
            return BuildForPublishEvent(request, value_size);

        case RequestType.Update:
            return BuildForUpdate(request, value_size);

        case RequestType.List:
        case RequestType.Info:
        case RequestType.Stats:
        case RequestType.Connections:
        case RequestType.Channels:
        case RequestType.WhoAmI:
            return BuildForStatus(request);

        default:
            throw new Error('Unsupported request type');
    }
};

/**
 * Parse response
 *
 * @param buffer
 * @param expected
 * @param value_size
 */
export function ParseResponse(buffer: Buffer, expected: ResponseType, value_size: ValueSize) {
    switch (expected) {
        case 'query':
            return HandleQuery(buffer, value_size);
        case 'list':
            return HandleList(buffer, value_size);
        case 'channels':
            return HandleChannels(buffer);
        case 'channel':
            return HandleChannel(buffer);
        case 'stats':
            return HandleStats(buffer);
        case 'connections':
            return HandleConnections(buffer);
        case 'connection':
            return HandleConnection(buffer);
        case 'info':
            return HandleInfo(buffer);
        case 'stat':
            return HandleStat(buffer);
        case 'status':
            return HandleStatus(buffer);
        case 'whoami':
            return HandleWhoAmI(buffer);
        case 'get':
            return HandleGet(buffer, value_size);
        default:
            return {
                success: false,
                quota: 0,
                ttl_type: TTLType.Nanoseconds,
                ttl: 0,
            };
    }
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
        case RequestType.Subscribe:
        case RequestType.Unsubscribe:
        case RequestType.Publish:
            return 'status';
        case RequestType.Query:
            return 'query'; //
        case RequestType.Get:
            return 'get';
        case RequestType.List:
            return 'list'; //
        case RequestType.Info:
            return 'info';
        case RequestType.Stat:
            return 'stat';
        case RequestType.Stats:
            return 'stats';
        case RequestType.Connections:
            return 'connections';
        case RequestType.Connection:
            return 'connection';
        case RequestType.Channels:
            return 'channels';
        case RequestType.Channel:
            return 'channel';
        case RequestType.WhoAmI:
            return 'whoami';
        /* c8 ignore start */
        default:
            throw new Error('Unknown request type');
        /* c8 ignore stop */
    }
}
