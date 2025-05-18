import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: 'coverage',
            exclude: ['tests/', 'coverage/', 'dist/', 'vitest.setup.ts', 'vitest.config.ts'],
        },
        fileParallelism: false,
        testTimeout: 30000,
    },
});
