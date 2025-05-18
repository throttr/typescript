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
 * Connection configuration
 */
export interface ConnectionConfiguration {
    /**
     * On wait for writable socket attempts
     */
    on_wait_for_writable_socket_attempts?: number;

    /**
     * On wait for writable socket timeout per attempt
     */
    on_wait_for_writable_socket_timeout_per_attempt?: number;
}

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

    /**
     * Connection configuration
     */
    connection_configuration?: ConnectionConfiguration;
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

    /**
     * Set
     */
    Set = 0x05,

    /**
     * Get
     */
    Get = 0x06,
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
    Quota = 0x00,

    /**
     * TTL
     */
    TTL = 0x01,
}

/**
 * Change types
 */
export enum ChangeType {
    /**
     * Patch
     */
    Patch = 0x00,

    /**
     * Increase
     */
    Increase = 0x01,

    /**
     * Decrease
     */
    Decrease = 0x02,
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
 * Get request
 */
export interface GetRequest {
    /**
     * Type
     */
    type: RequestType.Get;

    /**
     * Key
     */
    key: string;
}

/**
 * Get request
 */
export interface SetRequest {
    /**
     * Type
     */
    type: RequestType.Set;

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

    /**
     * Value
     */
    value: string;
}

/**
 * Request
 */
export type Request =
    | InsertRequest
    | QueryRequest
    | PurgeRequest
    | UpdateRequest
    | SetRequest
    | GetRequest;

/**
 * Query response
 */
export interface QueryResponse {
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
 * Get response
 */
export interface GetResponse {
    /**
     * Allowed
     */
    success: boolean;

    /**
     * TTL type
     */
    ttl_type: TTLType;

    /**
     * TTL remaining
     */
    ttl: number | bigint;

    /**
     * Value
     */
    value: string;
}

/**
 * Status response
 */
export interface StatusResponse {
    /**
     * Success
     */
    success: boolean;
}

/**
 * Response types
 */
export type ResponseType = 'status' | 'query' | 'get';

/**
 * Request
 */
export type Response = StatusResponse | QueryResponse | GetResponse;

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

    /**
     * Expected type
     */
    expectedType: ResponseType;
}
