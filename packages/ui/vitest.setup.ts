import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

// vitest-axe/extend-expect não registra o matcher no vitest 2; registramos à mão.
expect.extend(axeMatchers);
afterEach(() => cleanup());
