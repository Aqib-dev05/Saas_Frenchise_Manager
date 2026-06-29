const crypto = require('crypto')

// Excludes visually-confusing characters (0/O, 1/I/l) since these are read
// off a phone screen and typed by hand, often by someone non-technical.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const randomFrom = (chars, length) =>
  Array.from(crypto.randomBytes(length)).map((b) => chars[b % chars.length]).join('')

// e.g. "SHOP-7K2P9R" — short enough to read over a phone call, prefixed so
// it's unmistakably a portal login code rather than some other identifier.
const generatePortalCode = () => `SHOP-${randomFrom(CODE_CHARS, 6)}`

// A one-time plaintext password shown to the admin exactly once at
// generation time — only its bcrypt hash is ever persisted.
const generatePortalPassword = () => randomFrom(CODE_CHARS, 8)

module.exports = { generatePortalCode, generatePortalPassword }
