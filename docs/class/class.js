(() => {
  'use strict';
  const shareUrl = 'https://diu1773.github.io/solar-system-lab/class/';
  const panels = [...document.querySelectorAll('[data-panel]')];
  const tabs = [...document.querySelectorAll('[data-page]')];
  const names = {start:'시작하기',activities:'활동 해보기',codex:'Codex 따라하기',prompts:'프롬프트 모음',materials:'자료·공유'};
  let timer;
  function route(scroll = true) {
    const id = location.hash.slice(1);
    const selected = names[id] ? id : 'start';
    panels.forEach(p => {p.hidden = p.id !== selected;});
    tabs.forEach(t => {
      if (t.dataset.page === selected) t.setAttribute('aria-current','page');
      else t.removeAttribute('aria-current');
    });
    document.title = names[selected] + ' | 태양계천문학 × Codex';
    if (scroll) window.scrollTo({top:0,behavior:'instant'});
  }
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => {el.hidden = true;},2600);
  }
  async function copy(value) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      toast('복사했습니다. 붙여 넣어 사용하세요.');
    } catch {
      const dialog = document.getElementById('copyDialog');
      const field = document.getElementById('copyFallback');
      field.value = value;
      dialog.showModal();
      field.focus();
      field.select();
    }
  }
  document.querySelectorAll('[data-copy-url]').forEach(b => b.addEventListener('click',()=>copy(shareUrl)));
  document.querySelectorAll('[data-copy-prompt]').forEach(b => b.addEventListener('click',()=>copy(b.closest('.prompt').querySelector('[data-prompt]').textContent.trim())));
  document.querySelectorAll('[data-copy-announcement]').forEach(b => b.addEventListener('click',()=>copy('태양계천문학 × Codex 실습 자료\n'+shareUrl+'\n\n태양흑점·소행성·스펙트럼 실습과 Codex 따라 하기, 실제 관측 CSV, 요청문을 모았습니다. 웹 실습은 설치·로그인 없이 열립니다. “활동 해보기”에서 한 주제를 고르고, 직접 만들려면 “Codex 따라하기”의 실습 키트를 사용하세요.')));
  document.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click',()=>window.print()));
  const copyDialog = document.getElementById('copyDialog');
  copyDialog.addEventListener('click',e=>{if(e.target === copyDialog)copyDialog.close();});
  document.querySelector('.skip').addEventListener('click',e=>{
    e.preventDefault();
    document.getElementById('main').focus();
    window.scrollTo({top:0,behavior:'instant'});
  });
  window.addEventListener('hashchange',()=>route());
  route(false);
})();
