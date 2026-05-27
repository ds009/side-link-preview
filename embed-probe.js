/* Embed-failure probe for Side Panel blocked-page diagnostics.
 * Loaded only by background.js (service worker). */

function extractFrameAncestors(csp) {
  if (!csp) return null;
  const m = String(csp).match(/frame-ancestors\s+([^;]+)/i);
  return m ? m[1].trim() : null;
}

function extractMetaCspFromHtml(html) {
  const out = [];
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const isCspMeta =
      /http-equiv\s*=\s*["']?content-security-policy/i.test(tag) ||
      /http-equiv\s*=\s*["']?content-security-policy-report-only/i.test(tag);
    if (!isCspMeta) continue;
    const content =
      tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bcontent\s*=\s*([^\s>"']+)/i)?.[1];
    if (content) out.push(content);
  }
  return out;
}

const HTML_PROBE_LIMIT = 100000;

/** Read at most `limit` chars from a fetch body without buffering huge pages. */
async function readResponsePrefix(resp, limit) {
  if (!resp.body) {
    const t = await resp.text();
    return t.slice(0, limit);
  }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let out = '';
  try {
    while (out.length < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      out += dec.decode(value, { stream: true });
      if (out.length >= limit) {
        out = out.slice(0, limit);
        break;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch (_) {}
  }
  return out;
}

function xfoBlocksEmbed(value) {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'deny' || v === 'sameorigin' || v.startsWith('allow-from');
}

/** True when frame-ancestors likely blocks embedding from chrome-extension:// */
function frameAncestorsBlocksEmbed(fa) {
  if (!fa) return false;
  const v = fa.trim().toLowerCase();
  if (v.includes("'none'")) return true;
  if (/^\*(\s|$)/.test(v) || v === '*') return false;
  if (/chrome-extension:/.test(v)) return false;
  return true;
}

function pushReason(reasons, seen, entry) {
  const key = `${entry.id}:${entry.detail || ''}`;
  if (seen.has(key)) return;
  seen.add(key);
  reasons.push(entry);
}

/**
 * Probe why a URL may refuse Side Panel iframe embedding.
 * @returns {Promise<{ reasons: Array<{id:string,detail:string}>, debug: string[] }>}
 */
async function probeEmbedBlock(url) {
  const reasons = [];
  const debug = [];
  const seen = new Set();

  pushReason(reasons, seen, {
    id: 'timeout-no-loaded',
    detail: '',
  });

  if (!url || !/^https?:\/\//i.test(url)) {
    pushReason(reasons, seen, {
      id: 'fetch-error',
      detail: 'invalid URL',
    });
    return { reasons, debug };
  }

  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' },
    });

    debug.push(`HTTP ${resp.status} ${resp.statusText}`);
    debug.push(`Final URL: ${resp.url}`);

    if (resp.url && resp.url.replace(/\/$/, '') !== url.replace(/\/$/, '')) {
      pushReason(reasons, seen, {
        id: 'redirect',
        detail: `${url} → ${resp.url}`,
      });
    }

    const xfo = resp.headers.get('x-frame-options');
    if (xfo) {
      debug.push(`X-Frame-Options: ${xfo}`);
      if (xfoBlocksEmbed(xfo)) {
        pushReason(reasons, seen, { id: 'xfo', detail: xfo });
      }
    }

    for (const h of [
      'content-security-policy',
      'content-security-policy-report-only',
      'x-webkit-csp',
    ]) {
      const csp = resp.headers.get(h);
      if (!csp) continue;
      const fa = extractFrameAncestors(csp);
      if (fa) {
        debug.push(`${h} frame-ancestors: ${fa}`);
        if (frameAncestorsBlocksEmbed(fa)) {
          pushReason(reasons, seen, { id: 'csp-header', detail: fa });
        }
      }
    }

    const headChunk = await readResponsePrefix(resp, HTML_PROBE_LIMIT);

    for (const metaCsp of extractMetaCspFromHtml(headChunk)) {
      const fa = extractFrameAncestors(metaCsp);
      if (fa) {
        debug.push(`meta CSP frame-ancestors: ${fa}`);
        if (frameAncestorsBlocksEmbed(fa)) {
          pushReason(reasons, seen, { id: 'meta-csp', detail: fa });
        }
      } else if (/frame-ancestors/i.test(metaCsp)) {
        debug.push(`meta CSP: ${metaCsp.slice(0, 240)}`);
      }
    }

    if (
      /top\s*!==\s*self|top\.location\s*!=|window\.top\s*!==\s*window\.self|parent\s*!==\s*self/i.test(
        headChunk,
      )
    ) {
      pushReason(reasons, seen, { id: 'js-frame-bust', detail: '' });
      debug.push('JS frame-busting pattern matched in HTML');
    }

    if (
      /\/login|\/signin|\/auth(?:\/|$|\?)/i.test(resp.url) &&
      !/\/login|\/signin|\/auth(?:\/|$|\?)/i.test(url)
    ) {
      pushReason(reasons, seen, {
        id: 'redirect-login',
        detail: resp.url,
      });
    }

    const hasPolicyBlock = reasons.some((r) =>
      ['xfo', 'csp-header', 'meta-csp'].includes(r.id),
    );

    if (!hasPolicyBlock && resp.ok) {
      if (
        reasons.some((r) => r.id === 'redirect-login') ||
        reasons.some((r) => r.id === 'redirect')
      ) {
        pushReason(reasons, seen, { id: 'cookie-likely', detail: '' });
      } else if (!reasons.some((r) => r.id === 'js-frame-bust')) {
        pushReason(reasons, seen, { id: 'cookie-likely', detail: '' });
      }
    }

    if (
      reasons.length === 1 &&
      reasons[0].id === 'timeout-no-loaded'
    ) {
      pushReason(reasons, seen, { id: 'unknown', detail: '' });
      debug.push('No explicit embed policy found in HTTP headers or meta tags.');
    }
  } catch (err) {
    pushReason(reasons, seen, {
      id: 'fetch-error',
      detail: err?.message || String(err),
    });
    debug.push(`Fetch error: ${err?.message || err}`);
  }

  return { reasons, debug };
}
