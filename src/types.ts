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
     * Value size
     */
    value_size: ValueSize;

    /**
     * Maximum connections
     */
    max_connections?: number;
}

export enum RequestType {
    Insert = 0x01,
    Query = 0x02,
    Update = 0x03,
    Purge = 0x04,
}

export enum ValueSize {
    UInt8 = 0x01,
    UInt16 = 0x02,
    UInt32 = 0x04,
    UInt64 = 0x08,
}

/**
 * TTL types
 */
export enum TTLType {
    Nanoseconds = 0x01,
    Microseconds = 0x02,
    Milliseconds = 0x03,
    Seconds = 0x04,
    Minutes = 0x05,
    Hours = 0x06,
}

/**
 * Attributes types
 */
export enum AttributeType {
    Quota = 0,
    TTL = 1,
}

/**
 * Change types
 */
export enum ChangeType {
    Patch = 0,
    Increase = 1,
    Decrease = 2,
}

/**
 * Insert request
 */
export interface InsertRequest {
    type: RequestType.Insert;
    quota: number | bigint;
    ttl_type: TTLType;
    ttl: number | bigint;
    key: string;
}

/**
 * Query request
 */
export interface QueryRequest {
    type: RequestType.Query;
    key: string;
}

/**
 * Purge request
 */
export interface PurgeRequest {
    type: RequestType.Purge;
    key: string;
}

/**
 * Update request
 */
export interface UpdateRequest {
    type: RequestType.Update;
    attribute: AttributeType;
    change: ChangeType;
    value: number | bigint;
    key: string;
}

/**
 * Request
 */
export type Request = InsertRequest | QueryRequest | PurgeRequest | UpdateRequest;

/**
 * Full response
 */
export interface FullResponse {
    /**
     * Allowed
     */
    success: boolean;

    /**
     * Quota remaining
     */
    quota: number | bigint;

    /**
     * TTL type
     */
    ttl_type: TTLType;

    /**
     * TTL remaining
     */
    ttl: number | bigint;
}

/**
 * Simple response
 */
export interface SimpleResponse {
    /**
     * Success
     */
    success: boolean;
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
    resolve: (response: FullResponse | SimpleResponse) => void;

    /**
     * Reject
     *
     * @param error
     */
    reject: (error: any) => void;

    /**
     * Expected size
     */
    expectedSize: number;

    /**
     * Expected type
     */
    expectedType: 'full' | 'simple';
}
