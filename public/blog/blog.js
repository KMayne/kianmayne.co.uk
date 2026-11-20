// Shared behaviour for every blog post: reading time, the poll and the comments.
// Posts load this with <script src="/blog/blog.js" defer></script>.

const CONFIG = {
  // Public Tailscale Funnel URLs of the services on the home cluster (see services/*/README.md)
  pollApi: 'https://poll.YOUR-TAILNET.ts.net',
  commentsHost: 'https://comments.YOUR-TAILNET.ts.net',
  commentsSite: 'kianmayne',
  // Comment threads are keyed by this origin + the page path, so www, the apex and
  // local previews all share one thread per post.
  canonicalOrigin: 'https://www.kianmayne.co.uk',
};

// Local preview: talk to services running on this machine instead
if (location.hostname === 'localhost') {
  CONFIG.pollApi = 'http://localhost:8099';
  CONFIG.commentsHost = 'http://localhost:8090';
}

// Reading time, into any element with data-reading-time
(() => {
  const target = document.querySelector('[data-reading-time]');
  const article = document.querySelector('article');
  if (!target || !article) return;
  const words = article.innerText.trim().split(/\s+/).length;
  target.textContent = `${Math.max(1, Math.round(words / 230))} min read`;
})();

// Poll: <section class="poll" data-poll="next-writeup"><h2>…</h2><ol></ol><p class="status"></p></section>
(() => {
  const root = document.querySelector('.poll[data-poll]');
  if (!root) return;
  const list = root.querySelector('ol');
  const status = root.querySelector('.status');
  const base = `${CONFIG.pollApi}/polls/${root.dataset.poll}`;

  // A random id kept in this browser, so a reader can change their vote. No cookies.
  const newId = () => [...crypto.getRandomValues(new Uint8Array(16))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  let voter;
  try {
    voter = localStorage.getItem('poll-voter');
    if (!/^[0-9a-f]{32}$/.test(voter || '')) {
      voter = newId();
      localStorage.setItem('poll-voter', voter);
    }
  } catch {
    voter = newId();
  }

  let busy = false;

  function render(data) {
    const voted = data.yourVote != null;
    list.replaceChildren(...data.options.map(o => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(o.id === data.yourVote));
      btn.addEventListener('click', () => vote(o.id));

      const pct = data.total ? Math.round(100 * o.votes / data.total) : 0;
      const bar = document.createElement('span');
      bar.className = 'bar';
      bar.style.width = voted ? `${pct}%` : '0';

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = o.label;
      if (o.hint) {
        const hint = document.createElement('span');
        hint.className = 'hint';
        hint.textContent = o.hint;
        label.append(hint);
      }

      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = voted ? `${pct}%` : '';

      btn.append(bar, label, count);
      const li = document.createElement('li');
      li.append(btn);
      return li;
    }));
    status.textContent = voted
      ? `${data.total} vote${data.total === 1 ? '' : 's'} so far. Changed your mind? Pick another.`
      : 'Pick one to vote and see the results.';
  }

  async function request(url, init) {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  }

  async function vote(option) {
    if (busy) return;
    busy = true;
    status.textContent = 'Voting…';
    try {
      render(await request(`${base}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter, option }),
      }));
    } catch (e) {
      status.textContent = `That didn't work: ${e.message}`;
    } finally {
      busy = false;
    }
  }

  status.textContent = 'Loading the poll…';
  request(`${base}?voter=${voter}`)
    .then(render)
    .catch(() => { status.textContent = "The poll can't be reached right now. Try again later!"; });
})();

// Comments (Remark42): <section class="comments"><h2>…</h2><div id="remark42"></div></section>
// Nothing is requested from the comments server until the reader scrolls near them.
(() => {
  const mount = document.getElementById('remark42');
  if (!mount) return;
  const note = mount.parentElement.querySelector('.note');

  function load() {
    window.remark_config = {
      host: CONFIG.commentsHost,
      site_id: CONFIG.commentsSite,
      url: CONFIG.canonicalOrigin + location.pathname,
      page_title: document.title,
      theme: 'dark',
      locale: 'en',
      show_email_subscription: false,
      no_footer: true,
    };
    const script = document.createElement('script');
    script.type = 'module';
    script.src = `${CONFIG.commentsHost}/web/embed.mjs`;
    script.onerror = () => {
      if (note) note.textContent = "Comments can't be reached right now. Try again later!";
    };
    document.head.append(script);
  }

  if (!('IntersectionObserver' in window)) return load();
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      io.disconnect();
      load();
    }
  }, { rootMargin: '600px' });
  io.observe(mount);
})();
