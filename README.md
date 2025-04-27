# Throttr TypeScript SDK

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


## Installation

```bash
yarn add @throttr/sdk
```

or

```bash
npm install @throttr/sdk
```

## Basic Usage

```typescript
import { Service, Request, Response } from "@throttr/sdk";

const service = new Service({
  host: "127.0.0.1",
  port: 9000,
});

await service.connect();

const request: Request = {
  ip: "127.0.0.1",
  port: 37451,
  url: "GET /api/resource",
  max_requests: 5,
  ttl: 5000, // in milliseconds
};

const response: Response = await service.send(request);

console.log(response);
// { can: true, available_requests: 4, ttl: 4950 }

service.disconnect();
```

## Technical Notes

- The protocol assumes Little Endian architecture.
- The server does not respond to malformed requests.
- IP must be a valid IPv4 or IPv6 address; otherwise, an error is thrown.
- The internal message queue ensures requests are processed sequentially.
- Throttr independently manages quotas per IP, port, and URL.

---

## License

Distributed under the [GNU Affero General Public License v3.0](./LICENSE).
