import { defineConfig } from 'cypress'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar .env.local para variáveis CYPRESS_* (não commitar credenciais)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const baseUrl = process.env.CYPRESS_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 15000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      premiumEmail: process.env.CYPRESS_PREMIUM_EMAIL || '',
      premiumPassword: process.env.CYPRESS_PREMIUM_PASSWORD || '',
      testPhone: process.env.CYPRESS_TEST_PHONE || '',
      testHelperKey: process.env.CYPRESS_TEST_HELPER_KEY || '',
    },
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      reportDir: 'cypress/reports',
      overwrite: false,
      html: true,
      json: true,
      charts: true,
    },
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on)
      return config
    },
  },
})
