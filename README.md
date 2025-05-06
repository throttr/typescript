# Throttr SDK for TypeScript

<p align="center">
<a href="https://github.com/throttr/typescript/actions/workflows/build.yml"><img src="https://github.com/throttr/throttr/actions/workflows/build.yml/badge.svg" alt="Build"></a>
<a href="https://codecov.io/gh/throttr/typescript"><img src="https://codecov.io/gh/throttr/typescript/graph/badge.svg?token=7YG7SJ3FFM" alt="Coverage"></a>
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=alert_status" alt="Quality Gate"></a>
</p>

<p align="center">
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=bugs" alt="Bugs"></a>
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=vulnerabilities" alt="Vulnerabilities"></a>
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=code_smells" alt="Code Smells"></a>
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=duplicated_lines_density" alt="Duplicated Lines"></a>
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=sqale_index" alt="Technical Debt"></a>
</p>

<p align="center">
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=reliability_rating" alt="Reliability"></a>
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_typescript&metric=security_rating" alt="Security"></a>
<a href="https://sonarcloud.io/project/overview?id=throttr_typescript"><img src="https://sonarcloud.io/api/project_badges/measure?project=throttr_throttr&metric=sqale_rating" alt="Maintainability"></a>
</p>

TypeScript/Node.js client for communicating with a Throttr server over TCP.

The SDK enables sending traffic control requests efficiently, without HTTP, respecting the server's native binary protocol.

## 🛠️ Installation

Add the dependency using Yarn or NPM:

```bash
yarn add @throttr/sdk
```

or

```bash
npm install @throttr/sdk
```

## Basic Usage

```typescript
import { 
    Service,
    RequestType,
    TTLType,
    AttributeType,
    ChangeType,
    ValueSize
} from '@throttr/sdk';

const service = new Service({
    host: '127.0.0.1',
    port: 9000,
    max_connections: 4, // Optional: configure concurrent connections
    value_type: ValueSize.UInt16,
});

// Define a key (example: IP + port + path, UUID, or custom identifier)
const key = '127.0.0.1:1234/api/resource';

// Connect to Throttr
await service.connect();

// Insert quota for a consumer-resource pair
const insert_response = await service.send({
    type: RequestType.Insert,
    key: key,
    quota: 5,
    ttl_type: TTLType.Seconds,
    ttl: 60,
});

console.log('Success:', insert_response.success);

// Update the available quota
await service.send({
    type: RequestType.Update,
    attribute: AttributeType.Quota,
    change: ChangeType.Decrease,
    value: 1,
});

// Query the available quota
const query_response = await service.send({
    type: RequestType.Query,
    key: key,
});

console.log('Success:', query_response.success);
console.log('Quota:', query_response.quota);
console.log('TTL Type:', query_response.ttl_type);
console.log('TTL:', query_response.ttl);

// Optionally, purge the quota
await service.send({
    type: RequestType.Purge,
    key: key,
});

// Disconnect once done
service.disconnect();
```

See more examples in [tests](./tests/service.test.ts).

## Technical Notes

- The protocol assumes Little Endian architecture.
- The internal message queue ensures requests are processed sequentially.
- The package is defined to works with protocol 4.0.1 or greatest.

---

## License

Distributed under the [GNU Affero General Public License v3.0](./LICENSE).
