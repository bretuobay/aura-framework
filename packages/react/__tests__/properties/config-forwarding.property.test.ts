// Feature: aura-react, Property 1: Config Forwarding Round-Trip
// **Validates: Requirements 1.9, 12.1**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { arbAuraClientConfig } from '../arbitraries/config.arbitrary';

// Mock @aura/sdk before importing components that use it
vi.mock('@aura/sdk', () => ({
  createAuraClient: vi.fn(() => ({
    status: 'idle',
    init: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    emit: vi.fn(),
    feedback: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    onError: vi.fn(() => () => {}),
  })),
}));

import { createAuraClient } from '@aura/sdk';
import { AuraProvider } from '../../src/AuraProvider';

describe('Property 1: Config Forwarding Round-Trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createAuraClient receives structurally equal config for all valid configs', () => {
    fc.assert(
      fc.property(arbAuraClientConfig, (config) => {
        const { endpoint, manifest, userId, consentProfile, context } = config;

        const { unmount } = render(
          React.createElement(
            AuraProvider,
            { endpoint, manifest, userId, consentProfile, context },
            React.createElement('div'),
          ),
        );

        expect(createAuraClient).toHaveBeenCalledTimes(1);
        expect(createAuraClient).toHaveBeenCalledWith({
          endpoint,
          manifest,
          userId,
          consentProfile,
          context,
        });

        unmount();
        cleanup();
        vi.clearAllMocks();
      }),
      { numRuns: 100 },
    );
  });
});
