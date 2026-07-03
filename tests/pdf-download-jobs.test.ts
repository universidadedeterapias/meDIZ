import assert from 'node:assert/strict'
import test from 'node:test'
import {
  pdfJobDedupeKey,
  publicPdfJobStatus,
  safePdfFilename
} from '../src/lib/library/pdf-download-job-utils'

test('dedupe key is stable inside the same UTC month', () => {
  const a = pdfJobDedupeKey('user-1', 'product-1', new Date('2026-07-01T00:00:00Z'))
  const b = pdfJobDedupeKey('user-1', 'product-1', new Date('2026-07-31T23:59:59Z'))
  assert.equal(a, b)
})

test('dedupe key changes in a new UTC month', () => {
  const july = pdfJobDedupeKey('user-1', 'product-1', new Date('2026-07-31T23:59:59Z'))
  const august = pdfJobDedupeKey('user-1', 'product-1', new Date('2026-08-01T00:00:00Z'))
  assert.notEqual(july, august)
})

test('download filename is ASCII-safe and bounded', () => {
  const filename = safePdfFilename('Sentido biológico: edição especial / 2026')
  assert.match(filename, /^[a-zA-Z0-9._-]+$/)
  assert.ok(filename.endsWith('-licenciado.pdf'))
  assert.ok(filename.length <= 96)
})

test('database statuses are exposed in lowercase', () => {
  assert.equal(publicPdfJobStatus('PROCESSING'), 'processing')
  assert.equal(publicPdfJobStatus('READY'), 'ready')
})
