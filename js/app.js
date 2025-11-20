const beats = [
  {
    title: 'Velvet Night',
    genre: 'Trap Soul',
    mood: 'melodic',
    bpm: 134,
    exclusiveFrom: 220,
    audio: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_9bf43638c4.mp3?filename=lofi-study-112191.mp3',
    notes: 'Warm pads, sub bass, analog lead',
  },
  {
    title: 'Iron Steps',
    genre: 'Drill',
    mood: 'dark',
    bpm: 144,
    exclusiveFrom: 180,
    audio: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_e5fa449c36.mp3?filename=hip-hop-100-bpm-10996.mp3',
    notes: 'Heavy 808 slides, UK bounce',
  },
  {
    title: 'Champagne Static',
    genre: 'Club / Afro',
    mood: 'club',
    bpm: 122,
    exclusiveFrom: 260,
    audio: 'https://cdn.pixabay.com/download/audio/2022/03/07/audio_460454de68.mp3?filename=disco-120-bpm-10911.mp3',
    notes: 'Sparkly plucks, dance-ready groove',
  },
  {
    title: 'Crimson Skyline',
    genre: 'Trap',
    mood: 'uplifting',
    bpm: 140,
    exclusiveFrom: 200,
    audio: 'https://cdn.pixabay.com/download/audio/2022/10/30/audio_5caa851c61.mp3?filename=hip-hop-112199.mp3',
    notes: 'Open chords, airy choirs',
  },
];

const orders = [
  { buyer: '@sapphire', beat: 'Velvet Night', license: 'Non-Exclusive WAV', total: '$50', status: 'Paid' },
  { buyer: '@plugworld', beat: 'Iron Steps', license: 'Exclusive', total: '$620', status: 'In escrow' },
  { buyer: '@clubedit', beat: 'Champagne Static', license: 'Non-Exclusive MP3', total: '$20', status: 'Delivered' },
];

const licensePrices = {
  'Non-Exclusive MP3': 20,
  'Non-Exclusive WAV': 50,
  'Exclusive': 150,
};

function renderTimeline() {
  const timeline = document.getElementById('liveTimeline');
  if (!timeline) return;
  const recent = [
    'Upload synced from @prodbyclyde',
    'New order: WAV + FLP — $50',
    'Exclusive inquiry pending',
    'Bot payout executed',
  ];
  timeline.innerHTML = recent
    .map((text) => `<div class="item"><span class="dot"></span><div>${text}</div></div>`) 
    .join('');
}

function renderBeats() {
  const grid = document.getElementById('beatsGrid');
  const term = (document.getElementById('searchBeats')?.value || '').toLowerCase();
  const mood = document.getElementById('filterMood')?.value || '';

  const filtered = beats.filter((b) => {
    const matchesMood = !mood || (b.mood || '').toLowerCase().includes(mood);
    const text = `${b.title} ${b.genre} ${b.mood}`.toLowerCase();
    const matchesSearch = !term || text.includes(term);
    return matchesMood && matchesSearch;
  });

  grid.innerHTML = filtered
    .map(
      (b) => `
      <article class="beat-card glassy">
        <div class="top-line">
          <div>
            <p class="genre">${b.genre}</p>
            <h4>${b.title}</h4>
          </div>
          <button class="btn btn-outline btn-sm" data-buy="${b.title}">Buy</button>
        </div>
        <p class="meta">Mood: ${b.mood} • ${b.bpm} BPM</p>
        <div class="price-row">
          <span class="badge">MP3 $20</span>
          <span class="badge">WAV + FLP $50</span>
          <span class="badge">Exclusive from $${b.exclusiveFrom}</span>
        </div>
        <div class="audio-bar" aria-hidden="true"></div>
        <p class="meta">${b.notes}</p>
      </article>
    `,
    )
    .join('');

  grid.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', (e) => openCheckout(e.target.getAttribute('data-buy')));
  });
}

function renderOrders() {
  const table = document.getElementById('ordersTable');
  if (!table) return;
  table.innerHTML = orders
    .map(
      (o) => `
      <tr>
        <td>${o.buyer}</td>
        <td>${o.beat}</td>
        <td>${o.license}</td>
        <td>${o.total}</td>
        <td><span class="badge bg-danger-soft">${o.status}</span></td>
      </tr>
    `,
    )
    .join('');
}

function openCheckout(title) {
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('checkoutModal'));
  document.getElementById('checkoutBeat').value = title;
  modal.show();
}

function addBeat(event) {
  event.preventDefault();
  const title = document.getElementById('beatTitle').value.trim();
  const genre = document.getElementById('beatGenre').value.trim();
  const mood = document.getElementById('beatMood').value.trim();
  const bpm = document.getElementById('beatBpm').value.trim();
  const exclusiveFrom = parseInt(document.getElementById('beatExclusive').value.trim() || '150', 10);
  const audio = document.getElementById('beatAudio').value.trim();
  const notes = document.getElementById('beatNotes').value.trim();

  if (!title || !genre) return;
  beats.unshift({ title, genre, mood, bpm, exclusiveFrom, audio, notes });
  renderBeats();
  event.target.reset();
}

function completeOrder() {
  const beat = document.getElementById('checkoutBeat').value;
  const buyer = document.getElementById('checkoutBuyer').value || '@client';
  const license = document.getElementById('checkoutLicense').value;
  const total = `$${licensePrices[license] || licensePrices.Exclusive}`;
  orders.unshift({ buyer, beat, license, total, status: 'Paid' });
  renderOrders();
  bootstrap.Modal.getInstance(document.getElementById('checkoutModal'))?.hide();
}

function wireFilters() {
  document.getElementById('searchBeats')?.addEventListener('input', renderBeats);
  document.getElementById('filterMood')?.addEventListener('change', renderBeats);
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    document.getElementById('searchBeats').value = '';
    document.getElementById('filterMood').value = '';
    renderBeats();
  });
}

function initDraftButton() {
  const draftBtn = document.getElementById('saveDraft');
  draftBtn?.addEventListener('click', () => {
    draftBtn.textContent = 'Draft saved';
    draftBtn.disabled = true;
    setTimeout(() => {
      draftBtn.textContent = 'Save draft';
      draftBtn.disabled = false;
    }, 1600);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderTimeline();
  renderBeats();
  renderOrders();
  wireFilters();
  initDraftButton();

  document.getElementById('uploadForm')?.addEventListener('submit', addBeat);
  document.getElementById('confirmCheckout')?.addEventListener('click', completeOrder);
});
