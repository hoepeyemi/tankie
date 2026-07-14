import { context, requestExpandedMode } from '@devvit/web/client';

const btn = document.getElementById('play-btn') as HTMLButtonElement;

btn.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

// Show username if available
if (context.username) {
  const p = document.querySelector('p') as HTMLParagraphElement;
  p.textContent = `Hey u/${context.username} — ready to battle?`;
}
