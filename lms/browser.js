for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const prompt = document.getElementById(button.dataset.copy);
    const feedback = button.parentElement.querySelector('[role=status]');
    try {
      await navigator.clipboard.writeText(prompt.value);
      feedback.textContent = 'Prompt copié.';
    } catch {
      prompt.focus();
      prompt.select();
      feedback.textContent = 'Le prompt est sélectionné. Copiez-le avec votre clavier.';
    }
  });
}
for (const input of document.querySelectorAll('[data-variable]')) {
  input.addEventListener('input', () => {
    const prompt = document.getElementById(input.dataset.variable);
    const values = new Map([...input.closest('section').querySelectorAll('[data-variable]')].map((field) => [field.name, field.value]));
    prompt.value = prompt.defaultValue.replace(/\{\{([\p{L}\p{N}_-]+)\}\}/gu, (match, key) => values.get(key) || match);
  });
}
