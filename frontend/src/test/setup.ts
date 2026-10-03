import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Bez `globals: true` Testing Library nie sprząta DOM-u sam między testami
afterEach(cleanup)
