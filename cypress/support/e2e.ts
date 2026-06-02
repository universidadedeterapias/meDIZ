// ***********************************************************
// Suporte E2E - carrega antes de cada spec
// ***********************************************************
import 'cypress-mochawesome-reporter/register'
import './commands'

// Manter sessão entre specs (opcional): descomente se quiser reutilizar login
// Cypress.Cookies.defaults({ preserve: ['next-auth.session-token'] })
