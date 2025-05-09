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

/**
 * Request type
 */
export enum RequestType {
    /**
     * Insert
     */
    Insert = 0x01,

    /**
     * Query
     */
    Query = 0x02,

    /**
     * Update
     */
    Update = 0x03,

    /**
     * Purge
     */
    Purge = 0x04,
}

/**
 * Value size
 */
export enum ValueSize {
    /**
     * uint8
     */
    UInt8 = 0x01,

    /**
     * uint16
     */
    UInt16 = 0x02,

    /**
     * uint32
     */
    UInt32 = 0x04,

    /**
     * uint64
     */
    UInt64 = 0x08,
}

/**
 * TTL types
 */
export enum TTLType {
    /**
     * Nanoseconds
     */
    Nanoseconds = 0x01,

    /**
     * Microseconds
     */
    Microseconds = 0x02,

    /**
     * Milliseconds
     */
    Milliseconds = 0x03,

    /**
     * Seconds
     */
    Seconds = 0x04,

    /**
     * Minutes
     */
    Minutes = 0x05,

    /**
     * Hours
     */
    Hours = 0x06,
}

/**
 * Attributes types
 */
export enum AttributeType {
    /**
     * Quota
     */
    Quota = 0,

    /**
     * TTL
     */
    TTL = 1,
}

/**
 * Change types
 */
export enum ChangeType {
    /**
     * Patch
     */
    Patch = 0,

    /**
     * Increase
     */
    Increase = 1,

    /**
     * Decrease
     */
    Decrease = 2,
}

/**
 * Insert request
 */
export interface InsertRequest {
    /**
     * Type
     */
    type: RequestType.Insert;

    /**
     * Quota
     */
    quota: number | bigint;

    /**
     * TTL type
     */
    ttl_type: TTLType;

    /**
     * TTL
     */
    ttl: number | bigint;

    /**
     * Key
     */
    key: string;
}

/**
 * Query request
 */
export interface QueryRequest {
    /**
     * Type
     */
    type: RequestType.Query;

    /**
     * Key
     */
    key: string;
}

/**
 * Purge request
 */
export interface PurgeRequest {
    /**
     * Type
     */
    type: RequestType.Purge;

    /**
     * Key
     */
    key: string;
}

/**
 * Update request
 */
export interface UpdateRequest {
    /**
     * Type
     */
    type: RequestType.Update;

    /**
     * Attribute
     */
    attribute: AttributeType;

    /**
     * Change
     */
    change: ChangeType;

    /**
     * Value
     */
    value: number | bigint;

    /**
     * Value
     */
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
     * Expected type
     */
    expectedType: 'full' | 'simple';
}
