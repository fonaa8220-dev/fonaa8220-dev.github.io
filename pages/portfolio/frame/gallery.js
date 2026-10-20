/* A small, manually controlled gallery of real FRAME screens. */
(() => {
  const gallery = document.querySelector('[data-frame-gallery]');
  if (!gallery) return;

  const assetRoot = '../../../assets/projects/frame/';
  const slides = [
    {image: 'screen-home.jpg', title: '메인 · 첫 방문의 시작', alt: '대표 영화의 배경과 추천 영화 둘러보기 버튼이 있는 FRAME 첫 화면', description: '대표 영화와 함께 사이트의 기준을 소개합니다. ‘추천 영화 둘러보기’로 인기 영화부터 탐색할 수 있습니다.'},
    {image: 'screen-popular.jpg', title: '인기 영화 · 평점과 평가 수를 함께', alt: '인기 영화 순위와 TMDB 평점 및 평가 수를 보여주는 화면', description: '평가 100개 이상인 개봉 영화에서 평균 평점과 평가 수를 함께 반영합니다. 카드에서 순위와 관객 평가를 확인합니다.'},
    {image: 'screen-genres.jpg', title: '장르 탐색 · 지금 보고 싶은 이야기', alt: 'SF 장르를 선택해 장르별 인기 영화를 탐색하는 화면', description: '액션·드라마·SF 등 원하는 장르를 선택해 후보를 좁힙니다. 이 화면은 SF 장르를 선택한 실제 결과입니다.'},
    {image: 'screen-taste.jpg', title: '취향 설정 · 선택과 결과를 한 화면에서', alt: '좋아하는 장르를 선택하고 팝업 안에서 추천 영화를 확인하는 화면', description: '좋아하는 장르를 고르면 팝업 안에 영화가 나타납니다. 좋아요와 별점을 입력할 수 있고, ‘이 취향 저장하기’를 눌러야 확정됩니다.'},
    {image: 'screen-personal.jpg', title: '맞춤 추천 · 당신이 좋아할 거예요', alt: '선호 장르에 맞춰 개인화된 영화와 추천 이유를 보여주는 화면', description: '좋아요와 높은 별점의 영화가 있으면 비슷한 영화를 우선 추천합니다. 이 캡처는 선호 장르가 설정된 상태로, 장르 인기 영화와 실제 추천 근거를 보여줍니다.'},
    {image: 'screen-detail.jpg', title: '영화 상세 · 선택을 위한 정보', alt: '영화의 줄거리와 장르, 관객 평점, 내 별점 입력을 확인하는 상세 화면', description: '줄거리·장르·관객 평점·평가 수를 한곳에서 확인합니다. 내 별점을 남기거나, 현재 영화와 비슷한 이야기로 탐색을 이어갑니다.'}
  ];
  const image = gallery.querySelector('[data-gallery-image]');
  const opener = gallery.querySelector('[data-gallery-open]');
  const title = gallery.querySelector('[data-gallery-title]');
  const description = gallery.querySelector('[data-gallery-description]');
  const count = gallery.querySelector('[data-gallery-count]');
  const previous = gallery.querySelector('[data-gallery-prev]');
  const next = gallery.querySelector('[data-gallery-next]');
  const tabs = [...gallery.querySelectorAll('[data-slide]')];
  let current = 0;
  let pointerStart = null;
  let suppressClick = false;

  function show(index) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    const slide = slides[current];
    image.src = assetRoot + slide.image;
    image.alt = slide.alt;
    opener.href = image.src;
    opener.setAttribute('aria-label', `${slide.title} 이미지 크게 보기`);
    title.textContent = slide.title;
    description.textContent = slide.description;
    count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    count.setAttribute('aria-label', `전체 ${slides.length}개 화면 중 ${current + 1}번째`);
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    tabs.forEach((tab, index) => tab.setAttribute('aria-pressed', String(index === current)));
  }

  tabs.forEach(tab => tab.addEventListener('click', () => show(Number(tab.dataset.slide))));
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  gallery.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = {ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1}[event.key];
    if (target === undefined) return;
    event.preventDefault();
    show(target);
  });
  opener.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    suppressClick = false;
    pointerStart = {x: event.clientX, y: event.clientY};
  });
  opener.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      suppressClick = true;
      show(current + (dx < 0 ? 1 : -1));
    }
  });
  opener.addEventListener('pointercancel', () => { pointerStart = null; });
  opener.addEventListener('click', event => {
    if (suppressClick) {
      event.preventDefault();
      suppressClick = false;
    }
  });
  show(0);
})();
