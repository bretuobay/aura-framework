import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/protocol',
  'packages/sdk',
  'packages/react',
  'packages/server',
  'packages/rules',
  'packages/devtools',
]);
