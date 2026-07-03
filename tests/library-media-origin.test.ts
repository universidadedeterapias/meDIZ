import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedStreamFetchDest } from '../src/lib/library/media-origin'

test('allows iframe and embed destinations for PDF previews', () => {
  assert.equal(isAllowedStreamFetchDest('iframe', 'pdf'), true)
  assert.equal(isAllowedStreamFetchDest('embed', 'pdf'), true)
})

test('keeps direct document navigation blocked for PDFs', () => {
  assert.equal(isAllowedStreamFetchDest('document', 'pdf'), false)
})

test('does not allow embed destination for audio', () => {
  assert.equal(isAllowedStreamFetchDest('embed', 'audio'), false)
})
