import { passwordHash, write } from './db.mjs';

const [role, enteredEmail, name] = process.argv.slice(2);
const email = enteredEmail?.trim().toLowerCase();
if (process.stdin.isTTY || !['admin','trainer','learner'].includes(role)
  || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 100) {
  process.exitCode = 1;
  console.error('Usage : npm run user -- <admin|trainer|learner> <e-mail> <nom> (mot de passe sur stdin).');
} else {
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 260) throw new Error('Mot de passe trop long.');
  }
  const password = input.replace(/\r?\n$/, '');
  if (password.length < 12 || password.length > 256) throw new Error('Le mot de passe doit comporter entre 12 et 256 caractères.');
  write('INSERT INTO users(email,name,role,password) VALUES(?,?,?,?)', email, name, role, passwordHash(password));
  console.log('Compte créé.');
}
