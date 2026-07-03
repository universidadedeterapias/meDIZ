import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedStreamFetchDest } from '../src/lib/library/media-origin'

test('allows iframe and embed destinations for PDF previews', () => {
  assert.equal(isAllowedStreamFetchDest('iframe', 'pdf'), true)
  assert.equal(isAllowedStreamFetchDest('embed', 'pdf'), true)
})

test('allows Safari-style same-origin document navigation for PDF previews', () => {
  assert.equal(isAllowedStreamFetchDest('document', 'pdf', 'same-origin'), true)
})

test('keeps direct and cross-origin document navigation blocked for PDFs', () => {
  assert.equal(isAllowedStreamFetchDest('document', 'pdf'), false)
  assert.equal(isAllowedStreamFetchDest('document', 'pdf', 'none'), false)
  assert.equal(isAllowedStreamFetchDest('document', 'pdf', 'cross-site'), false)
})

test('does not extend same-origin document exception to other media', () => {
  assert.equal(isAllowedStreamFetchDest('document', 'audio', 'same-origin'), false)
})

test('does not allow embed destination for audio', () => {
  assert.equal(isAllowedStreamFetchDest('embed', 'audio'), false)
})
