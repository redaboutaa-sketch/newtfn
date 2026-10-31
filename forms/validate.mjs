// Validation serveur du formulaire de contact (pure, testable).
const POLES = ['automobile', 'beaute', 'ia', 'conseil'];
const PROFILS = ['', 'salarie', 'entreprise', 'reconversion', 'independant', 'autre'];
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const oneLine = (s, max) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function validate(form, { minFillMs = 3000, now = Date.now() } = {}) {
  // Antispam : champ piège rempli, ou formulaire soumis trop vite après l'affichage.
  if (form.site_web) return { spam: 'champ_piege', errors: [] };
  const t = Number(form.t);
  if (form.t && Number.isFinite(t) && now - t < minFillMs) return { spam: 'trop_rapide', errors: [] };

  const data = {
    nom: oneLine(form.nom, 120),
    email: oneLine(form.email, 160).toLowerCase(),
    telephone: oneLine(form.telephone, 30),
    profil: oneLine(form.profil, 20),
    pole: oneLine(form.pole || 'conseil', 20),
    sujet: oneLine(form.sujet, 160),
    message: String(form.message ?? '').replace(/\r\n/g, '\n').trim().slice(0, 5000),
  };
  const errors = [];
  if (data.nom.length < 2) errors.push('Indiquez votre nom et votre prénom.');
  if (!EMAIL.test(data.email)) errors.push('Indiquez une adresse e-mail valide (exemple : nom@exemple.fr).');
  if (data.telephone && !/^[+()0-9 .-]{6,30}$/.test(data.telephone)) errors.push('Le numéro de téléphone contient des caractères non valides.');
  if (!PROFILS.includes(data.profil)) errors.push('Le profil sélectionné est invalide.');
  if (!POLES.includes(data.pole)) errors.push('Le domaine sélectionné est invalide.');
  if (data.message.length < 10) errors.push('Votre message doit contenir au moins 10 caractères.');
  if ((data.message.match(/https?:\/\//g) || []).length > 3) errors.push('Votre message contient trop de liens.');
  if (form.consentement !== 'oui') errors.push('Merci d’accepter le traitement de vos données pour que nous puissions répondre.');
  return { data, errors, spam: null };
}
