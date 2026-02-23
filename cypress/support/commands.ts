/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login com credenciais (email/senha). Redireciona para /chat se sucesso.
       */
      login(email: string, password: string): Chainable<void>

      /**
       * Retorna o token de verificação do último signup para o email (apenas dev/test).
       */
      getVerificationToken(email: string): Chainable<string | null>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login')
      cy.get('[data-cy="login-email"]').clear().type(email)
      cy.get('[data-cy="login-password"]').clear().type(password)
      cy.get('[data-cy="login-submit"]').click()
      cy.url().should('include', '/chat')
    },
    { cacheAcrossSpecs: false }
  )
})

Cypress.Commands.add('getVerificationToken', (email: string) => {
  const key = Cypress.env('testHelperKey')
  if (!key) {
    throw new Error('CYPRESS_TEST_HELPER_KEY não definido em .env.local')
  }
  return cy
    .request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/test/verification-token`,
      qs: { email },
      headers: { 'x-cypress-test-key': key },
      failOnStatusCode: false,
    })
    .then((res) => {
      if (res.status === 200 && res.body?.token) return res.body.token
      return null
    })
})

export {}
