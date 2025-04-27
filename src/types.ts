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

/**
 * Configuration
 */
export interface Configuration {
    /**
     * Host
     */
    host: string;

    /**
     * Port
     */
    port: number;

    /**
     * Maximum connections
     */
    max_connections?: number;
}

/**
 * Request
 */
export interface Request {
    /**
     * IP address
     */
    ip: string;

    /**
     * Port
     */
    port: number;

    /**
     * URL
     */
    url: string;

    /**
     * Maximum requests
     */
    max_requests: number;

    /**
     * Time to live
     */
    ttl: number;
}

/**
 * Queued request
 */
export interface QueuedRequest {
    /**
     * Buffer
     */
    buffer: Buffer;

    /**
     * Resolve
     *
     * @param response
     */
    resolve: (response: Response) => void;

    /**
     * Reject
     *
     * @param error
     */
    reject: (error: any) => void;
}

/**
 * Response
 */
export interface Response {
    /**
     * Can
     */
    can: boolean;

    /**
     * Available requests
     */
    available_requests: number;

    /**
     * Time to live
     */
    ttl: number;
}

export interface IPBuffer {
    /**
     * Version
     */
    version: number;

    /**
     * Buffer
     */
    buffer: Buffer;
}

