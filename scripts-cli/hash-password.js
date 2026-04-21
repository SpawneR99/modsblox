#!/usr/bin/env node
// Usage: npm run hash -- 'YourStrongPassword'
const bcrypt = require('bcrypt');

const pwd = process.argv[2];
if (!pwd || pwd.length < 10) {
  console.error('Provide a password of at least 10 chars:  npm run hash -- \'MyPw123!\'');
  process.exit(1);
}
bcrypt.hash(pwd, 12).then((h) => {
  console.log(h);
});
