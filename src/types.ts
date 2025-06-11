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
 * Key type
 */
export enum KeyType {
    /**
     * Counter
     */
    Counter = 0x00,

    /**
     * Buffer
     */
    Buffer = 0x01,
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

    /**
     * List
     */
    List = 0x07,

    /**
     * Info
     */
    Info = 0x08,

    /**
     * Stat
     */
    Stat = 0x09,

    /**
     * Stats
     */
    Stats = 0x10,

    /**
     * Subscribe
     */
    Subscribe = 0x11,

    /**
     * Unsubscribe
     */
    Unsubscribe = 0x12,

    /**
     * Publish
     */
    Publish = 0x13,

    /**
     * Connections
     */
    Connections = 0x14,

    /**
     * Connection
     */
    Connection = 0x15,

    /**
     * Channels
     */
    Channels = 0x16,

    /**
     * Channel
     */
    Channel = 0x17,

    /**
     * WhoAmI ;)
     */
    WhoAmI = 0x18,

    /**
     * Event
     */
    Event = 0x19,
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
 * List request
 */
export interface ListRequest {
    /**
     * Type
     */
    type: RequestType.List;
}

/**
 * Info request
 */
export interface InfoRequest {
    /**
     * Type
     */
    type: RequestType.Info;
}

/**
 * Stat request
 */
export interface StatRequest {
    /**
     * Type
     */
    type: RequestType.Stat;

    /**
     * Key
     */
    key: string;
}

/**
 * Stats request
 */
export interface StatsRequest {
    /**
     * Type
     */
    type: RequestType.Stats;
}

/**
 * Subscribe request
 */
export interface SubscribeRequest {
    /**
     * Type
     */
    type: RequestType.Subscribe;

    /**
     * Channel
     */
    channel: string;

    /**
     * Callback
     *
     * @param data
     */
    callback: (data: string) => void;
}

/**
 * Unsubscribe request
 */
export interface UnsubscribeRequest {
    /**
     * Type
     */
    type: RequestType.Unsubscribe;

    /**
     * Channel
     */
    channel: string;
}

/**
 * Publish request
 */
export interface PublishRequest {
    /**
     * Type
     */
    type: RequestType.Publish;

    /**
     * Channel
     */
    channel: string;

    /**
     * Value
     */
    value: string;
}

/**
 * Connections request
 */
export interface ConnectionsRequest {
    /**
     * Type
     */
    type: RequestType.Connections;
}

/**
 * Connection request
 */
export interface ConnectionRequest {
    /**
     * Type
     */
    type: RequestType.Connection;

    /**
     * ID
     */
    id: string;
}

/**
 * Channels request
 */
export interface ChannelsRequest {
    /**
     * Type
     */
    type: RequestType.Channels;
}

/**
 * Channels request
 */
export interface ChannelRequest {
    /**
     * Type
     */
    type: RequestType.Channel;

    /**
     * Channel
     */
    channel: string;
}

/**
 * WhoAmI request
 */
export interface WhoAmIRequest {
    /**
     * Type
     */
    type: RequestType.WhoAmI;
}

/**
 * WhoAmI request
 */
export interface EventRequest {
    /**
     * Type
     */
    type: RequestType.Event;

    /**
     * Channel
     */
    channel: string;

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
    | GetRequest
    | ListRequest // Done
    | InfoRequest // Done
    | StatRequest // Done
    | StatsRequest // Done
    | SubscribeRequest // Done
    | UnsubscribeRequest // Done
    | PublishRequest // Done
    | ConnectionsRequest // Done
    | ConnectionRequest // Done
    | ChannelsRequest // Done
    | ChannelRequest // Done
    | WhoAmIRequest //
    | EventRequest;

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
 * List item
 */
export interface ListItem {
    /**
     * Key
     */
    key: string;

    /**
     * Key length
     */
    key_length: number;

    /**
     * Key type
     */
    key_type: KeyType;

    /**
     * TTL type
     */
    ttl_type: TTLType;

    /**
     * Expires at
     */
    expires_at: number;

    /**
     * Bytes used
     */
    bytes_used: number;
}

/**
 * List response
 */
export interface ListResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * Keys
     */
    keys: Array<ListItem>;
}

/**
 * Channel item
 */
export interface ChannelItem {
    /**
     * Key
     */
    channel: string;

    /**
     * Key length
     */
    channel_length: number;

    /**
     * Read bytes
     */
    read_bytes: number;

    /**
     * Write bytes
     */
    write_bytes: number;

    /**
     * Connections
     */
    connections: number;
}

/**
 * Channels response
 */
export interface ChannelsResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * Keys
     */
    channels: Array<ChannelItem>;
}

/**
 * Info response
 */
export interface InfoResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * Timestamp
     */
    timestamp: number;

    /**
     * Total requests
     */
    total_requests: number;

    /**
     * Total requests per minute
     */
    total_requests_per_minute: number;

    /**
     * Total insert requests
     */
    total_insert_requests: number;

    /**
     * Total insert requests per minute
     */
    total_insert_requests_per_minute: number;

    /**
     * Total query requests
     */
    total_query_requests: number;

    /**
     * Total query requests per minute
     */
    total_query_requests_per_minute: number;

    /**
     * Total update requests
     */
    total_update_requests: number;

    /**
     * Total update requests per minute
     */
    total_update_requests_per_minute: number;

    /**
     * Total purge requests
     */
    total_purge_requests: number;

    /**
     * Total purge requests per minute
     */
    total_purge_requests_per_minute: number;

    /**
     * Total get requests
     */
    total_get_requests: number;

    /**
     * Total get requests per minute
     */
    total_get_requests_per_minute: number;

    /**
     * Total set requests
     */
    total_set_requests: number;

    /**
     * Total set requests per minute
     */
    total_set_requests_per_minute: number;

    /**
     * Total list requests
     */
    total_list_requests: number;

    /**
     * Total list requests per minute
     */
    total_list_requests_per_minute: number;

    /**
     * Total info requests
     */
    total_info_requests: number;

    /**
     * Total info requests per minute
     */
    total_info_requests_per_minute: number;

    /**
     * Total stats requests
     */
    total_stats_requests: number;

    /**
     * Total stats requests per minute
     */
    total_stats_requests_per_minute: number;

    /**
     * Total stat requests
     */
    total_stat_requests: number;

    /**
     * Total stat requests per minute
     */
    total_stat_requests_per_minute: number;

    /**
     * Total subscribe requests
     */
    total_subscribe_requests: number;

    /**
     * Total subscribe requests per minute
     */
    total_subscribe_requests_per_minute: number;

    /**
     * Total unsubscribe requests
     */
    total_unsubscribe_requests: number;

    /**
     * Total unsubscribe requests per minute
     */
    total_unsubscribe_requests_per_minute: number;

    /**
     * Total publish requests
     */
    total_publish_requests: number;

    /**
     * Total publish requests per minute
     */
    total_publish_requests_per_minute: number;

    /**
     * Total channel requests
     */
    total_channel_requests: number;

    /**
     * Total channel requests per minute
     */
    total_channel_requests_per_minute: number;

    /**
     * Total channels requests
     */
    total_channels_requests: number;

    /**
     * Total channels requests per minute
     */
    total_channels_requests_per_minute: number;

    /**
     * Total whoami requests
     */
    total_whoami_requests: number;

    /**
     * Total whoami requests per minute
     */
    total_whoami_requests_per_minute: number;

    /**
     * Total connection requests
     */
    total_connection_requests: number;

    /**
     * Total connection requests per minute
     */
    total_connection_requests_per_minute: number;

    /**
     * Total connections requests
     */
    total_connections_requests: number;

    /**
     * Total connections requests per minute
     */
    total_connections_requests_per_minute: number;

    /**
     * Total read bytes
     */
    total_read_bytes: number;

    /**
     * Total read bytes
     */
    total_read_bytes_per_minute: number;

    /**
     * Total write bytes
     */
    total_write_bytes: number;

    /**
     * Total write bytes
     */
    total_write_bytes_per_minute: number;

    /**
     * Total keys
     */
    total_keys: number;

    /**
     * Total counters
     */
    total_counters: number;

    /**
     * Total buffers
     */
    total_buffers: number;

    /**
     * Total allocated bytes on counters
     */
    total_allocated_bytes_on_counters: number;

    /**
     * Total allocated bytes on buffers
     */
    total_allocated_bytes_on_buffers: number;

    /**
     * Total subscriptions
     */
    total_subscriptions: number;

    /**
     * Total channels
     */
    total_channels: number;

    /**
     * Startup timestamp
     */
    startup_timestamp: number;

    /**
     * Total connections
     */
    total_connections: number;

    /**
     * Version
     */
    version: string;
}

/**
 * Stat response
 */
export interface StatResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * Reads per minute
     */
    reads_per_minute: number;

    /**
     * Writes per minute
     */
    writes_per_minute: number;

    /**
     * Total reads
     */
    total_reads: number;

    /**
     * Total writes
     */
    total_writes: number;
}

export interface StatsItem {
    /**
     * Key
     */
    key: string;

    /**
     * Key length
     */
    key_length: number;

    /**
     * Reads per minute
     */
    reads_per_minute: number;

    /**
     * Writes per minute
     */
    writes_per_minute: number;

    /**
     * Total reads
     */
    total_reads: number;

    /**
     * Total writes
     */
    total_writes: number;
}

/**
 * Stats response
 */
export interface StatsResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * Keys
     */
    keys: Array<StatsItem>;
}

/**
 * Connections Item
 */
export interface ConnectionsItem {
    /**
     * ID
     */
    id: string;

    /**
     * Type
     */
    type: number;

    /**
     * Type
     */
    kind: number;

    /**
     * IP Version
     */
    ip_version: number;

    /**
     * IP
     */
    ip: string;

    /**
     * Port
     */
    port: number;

    /**
     * Connected at
     */
    connected_at: number;

    /**
     * Read bytes
     */
    read_bytes: number;

    /**
     * Write bytes
     */
    write_bytes: number;

    /**
     * Published bytes
     */
    published_bytes: number;

    /**
     * Received bytes
     */
    received_bytes: number;

    /**
     * Allocated bytes
     */
    allocated_bytes: number;

    /**
     * Consumed bytes
     */
    consumed_bytes: number;

    /**
     * Insert requests
     */
    insert_requests: number;

    /**
     * Set requests
     */
    set_requests: number;

    /**
     * Query requests
     */
    query_requests: number;

    /**
     * Get requests
     */
    get_requests: number;

    /**
     * Update requests
     */
    update_requests: number;

    /**
     * Purge requests
     */
    purge_requests: number;

    /**
     * List requests
     */
    list_requests: number;

    /**
     * Info requests
     */
    info_requests: number;

    /**
     * Stat requests
     */
    stat_requests: number;

    /**
     * Stats requests
     */
    stats_requests: number;

    /**
     * Publish requests
     */
    publish_requests: number;

    /**
     * Subscribe requests
     */
    subscribe_requests: number;

    /**
     * Unsubscribe requests
     */
    unsubscribe_requests: number;

    /**
     * Connections requests
     */
    connections_requests: number;

    /**
     * Channels requests
     */
    channels_requests: number;

    /**
     * Channel requests
     */
    channel_requests: number;

    /**
     * WhoAmI requests
     */
    whoami_requests: number;
}

/**
 * Connections response
 */
export interface ConnectionsResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * Keys
     */
    connections: Array<ConnectionsItem>;
}

/**
 * Connection response
 */
export interface ConnectionResponse extends ConnectionsItem {
    /**
     * Success
     */
    success: boolean;
}

/**
 * Connections Item
 */
export interface ChannelConnectionItem {
    /**
     * ID
     */
    id: string;

    /**
     * Subscribed at
     */
    subscribed_at: number;

    /**
     * Read bytes
     */
    read_bytes: number;

    /**
     * Write bytes
     */
    write_bytes: number;
}

/**
 * Channel response
 */
export interface ChannelResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * Keys
     */
    connections: Array<ChannelConnectionItem>;
}

/**
 * Whoami response
 */
export interface WhoAmIResponse {
    /**
     * Success
     */
    success: boolean;

    /**
     * ID
     */
    id: string;
}

/**
 * Response types
 */
export type ResponseType =
    | 'status'
    | 'query'
    | 'get'
    | 'info'
    | 'list'
    | 'connections'
    | 'connection'
    | 'channel'
    | 'channels'
    | 'stat'
    | 'stats'
    | 'whoami';

/**
 * Request
 */
export type Response =
    | StatusResponse
    | QueryResponse
    | GetResponse
    | StatResponse
    | ListResponse
    | InfoResponse
    | StatsResponse
    | ConnectionsResponse
    | ConnectionResponse
    | ChannelsResponse
    | ChannelRequest;

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
