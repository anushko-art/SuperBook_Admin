export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * GET /api/browse/test
 * Serves a minimal HTML page to exercise the /api/browse endpoint.
 * No React / no build step — pure inline HTML + vanilla JS.
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SuperBook — Browse Data (raw)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f1117; color: #e1e4e8; padding: 2rem; }
    h1 { font-size: 1.4rem; margin-bottom: 1rem; color: #58a6ff; }
    h2 { font-size: 1.1rem; margin: 1.2rem 0 .5rem; color: #79c0ff; }
    .crumbs { font-size: .85rem; color: #8b949e; margin-bottom: 1rem; }
    .crumbs span { cursor: pointer; text-decoration: underline; color: #58a6ff; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: .75rem 1rem; margin: .35rem 0; cursor: pointer; transition: border-color .15s; }
    .card:hover { border-color: #58a6ff; }
    .card .title { font-weight: 600; }
    .card .meta { font-size: .8rem; color: #8b949e; margin-top: .25rem; }
    pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem; overflow-x: auto; white-space: pre-wrap; word-break: break-word; font-size: .85rem; line-height: 1.5; }
    .loading { color: #8b949e; font-style: italic; }
    #raw-toggle { float: right; font-size: .8rem; cursor: pointer; color: #58a6ff; text-decoration: underline; border: none; background: none; }
    #raw-json { display: none; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>📚 SuperBook — Browse Data</h1>
  <div class="crumbs" id="breadcrumbs"></div>
  <button id="raw-toggle" onclick="toggleRaw()">Show raw JSON</button>
  <div id="content"><span class="loading">Loading…</span></div>
  <pre id="raw-json"></pre>

  <script>
    const BASE = '/api/browse';
    let lastJson = {};

    function toggleRaw() {
      const el = document.getElementById('raw-json');
      const btn = document.getElementById('raw-toggle');
      if (el.style.display === 'none') {
        el.style.display = 'block'; btn.textContent = 'Hide raw JSON';
      } else {
        el.style.display = 'none'; btn.textContent = 'Show raw JSON';
      }
    }

    async function load(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const url = qs ? BASE + '?' + qs : BASE;
      document.getElementById('content').innerHTML = '<span class="loading">Loading…</span>';

      const res = await fetch(url);
      const data = await res.json();
      lastJson = data;
      document.getElementById('raw-json').textContent = JSON.stringify(data, null, 2);
      render(data, params);
    }

    function render(data, params) {
      const el = document.getElementById('content');
      const bc = document.getElementById('breadcrumbs');

      // Step 1: grades & subjects
      if (data.step === 1) {
        bc.innerHTML = '<b>Home</b>';
        let html = '<h2>Select Class & Subject</h2>';
        (data.combinations || []).forEach(c => {
          html += '<div class="card" onclick="load({grade:\\'' + c.grade + '\\',subject:\\'' + c.subject + '\\'})">'
            + '<span class="title">Class ' + c.grade + ' — ' + c.subject + '</span>'
            + '<span class="meta">' + c.count + ' textbook(s)</span></div>';
        });
        el.innerHTML = html;
        return;
      }

      // Step 2: textbooks & chapters
      if (data.step === 2) {
        bc.innerHTML = '<span onclick="load()">Home</span> / <b>Class ' + data.grade + ' ' + data.subject + '</b>';
        let html = '<h2>Chapters</h2>';
        if (!data.chapters.length) html += '<p style="color:#8b949e">No chapters found.</p>';
        (data.chapters || []).forEach(ch => {
          html += '<div class="card" onclick="load({chapter_id:\\'' + ch.id + '\\'})">'
            + '<span class="title">Ch ' + ch.chapter_number + ': ' + ch.title + '</span>'
            + '<span class="meta">' + (ch.topic_count || 0) + ' topic(s) · '
            + (ch.estimated_read_time_minutes || '?') + ' min read</span></div>';
        });
        el.innerHTML = html;
        return;
      }

      // Step 3: topics for a chapter
      if (data.step === 3) {
        const ch = data.chapter || {};
        bc.innerHTML = '<span onclick="load()">Home</span>'
          + ' / <span onclick="load({grade:\\'' + ch.grade + '\\',subject:\\'' + ch.subject + '\\'})">Class ' + ch.grade + ' ' + ch.subject + '</span>'
          + ' / <b>Ch ' + (ch.chapter_number || '') + ': ' + (ch.title || '') + '</b>';
        let html = '<h2>Topics</h2>';
        if (!data.topics.length) html += '<p style="color:#8b949e">No topics found for this chapter.</p>';
        (data.topics || []).forEach(t => {
          html += '<div class="card" onclick="load({topic_id:\\'' + t.id + '\\'})">'
            + '<span class="title">' + t.order_index + '. ' + t.title + '</span>'
            + '<span class="meta">' + (t.difficulty_level || '') + ' · '
            + (t.content_length || 0) + ' chars</span></div>';
        });
        el.innerHTML = html;
        return;
      }

      // Step 4: single topic
      if (data.step === 4) {
        const t = data.topic || {};
        bc.innerHTML = '<span onclick="load()">Home</span>'
          + ' / <span onclick="load({grade:\\'' + t.grade + '\\',subject:\\'' + t.subject + '\\'})">Class ' + t.grade + ' ' + t.subject + '</span>'
          + ' / <b>' + t.title + '</b>';
        let html = '<h2>' + t.title + '</h2>'
          + '<p class="meta" style="margin-bottom:1rem">'
          + t.textbook_title + ' · Ch ' + t.chapter_number + ': ' + t.chapter_title
          + '</p>';
        if (t.source_markdown) {
          html += '<pre>' + escHtml(t.source_markdown) + '</pre>';
        } else {
          html += '<p style="color:#8b949e">No source markdown stored for this topic.</p>';
        }
        el.innerHTML = html;
        return;
      }

      el.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    }

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    load();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
