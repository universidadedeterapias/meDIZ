import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedStreamFetchDest } from '../src/lib/library/media-origin'

test('allows iframe and embed destinations for PDF previews', () => {
  assert.equal(isAllowedStreamFetchDest('iframe', 'pdf'), true)
  assert.equal(isAllowedStreamFetchDest('embed', 'pdf'), true)
})

test('allows mobile browsers to render PDF previews as documents', () => {
  assert.equal(isAllowedStreamFetchDest('document', 'pdf'), true)
})

test('does not extend the document exception to other media', () => {
  assert.equal(isAllowedStreamFetchDest('document', 'audio'), false)
  assert.equal(isAllowedStreamFetchDest('document', 'other'), false)
})

test('does not allow embed destination for audio', () => {
  assert.equal(isAllowedStreamFetchDest('embed', 'audio'), false)
})
