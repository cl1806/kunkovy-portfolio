const root = document.documentElement;

// Определяем тип перехода до отрисовки страницы
const navState = window.name || '';
window.name = '';

if (navState === 'nav:logo') {
  root.classList.add('no-preloader', 'is-page-entering');
} else if (navState === 'nav:smooth') {
  root.classList.add('no-preloader', 'is-page-entering');
} else {
  root.classList.add('is-loading');
}

function initApp() {
  const logoLink = document.getElementById('logo-link');
  const preloader = document.getElementById('preloader');
  const preloaderFill = document.getElementById('preloader-fill');
  const preloaderPercent = document.getElementById('preloader-percent');
  const siteHeader = document.getElementById('site-header');
  let isBusy = false;

  // Гарантируем наличие актуальной фавиконки в <head> на любой странице
  if (!document.querySelector('link[rel="icon"][href*="v=4"]')) {
    const icon32 = document.createElement('link');
    icon32.rel = 'icon';
    icon32.type = 'image/png';
    icon32.sizes = '32x32';
    icon32.href = 'Логотипы/favicon-32x32.png?v=4';
    document.head.appendChild(icon32);
  }

  // Плавное проявление контента после перехода между страницами
  if (root.classList.contains('is-page-entering')) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('is-page-entering');
      });
    });
  }

  // 1. Анимация процентов (0% -> 100%) на GPU без блокировки основного потока
  function runLoader(duration, onComplete) {
