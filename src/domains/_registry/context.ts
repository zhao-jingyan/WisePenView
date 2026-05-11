import { createContext } from 'react';

import type { ServicesContextValue } from './registry';

export const ServicesContext = createContext<ServicesContextValue | null>(null);
