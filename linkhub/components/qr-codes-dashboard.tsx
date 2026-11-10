'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Image, Link2, QrCode, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api, type ShortLink } from '@/lib/api';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function QrCodesDashboard() {
  const [links, setLinks] = useState<ShortLink[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const result = await api.shortLinks();
      setLinks(result);
      setSelectedId(current => result.some(link => link.id === current) ? current : result[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your short links.');
      setLinks([]);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const selected = useMemo(
    () => links?.find(link => link.id === selectedId) || null,
    [links, selectedId]
  );
  const value = selected ? api.shortLinkUrl(selected.code) : '';

  function downloadSvg() {
    const svg = document.querySelector('#kiungo-qr-preview svg');
    if (!(svg instanceof SVGSVGElement)) {
      setError('The QR code is not ready yet.');
      return;
    }
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', '1024');
    copy.setAttribute('height', '1024');
    downloadBlob(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' }), `kiungo-${selected?.code || 'qr'}.svg`);
    setNotice('SVG QR code downloaded.');
    setError('');
  }

  async function downloadPng() {
    const svg = document.querySelector('#kiungo-qr-preview svg');
    if (!(svg instanceof SVGSVGElement) || !selected) {
      setError('The QR code is not ready yet.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const copy = svg.cloneNode(true) as SVGSVGElement;
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      copy.setAttribute('width', '1024');
      copy.setAttribute('height', '1024');
      const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' }));
      try {
        const image = new window.Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Image export is not supported by this browser.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 1024, 1024);
        context.drawImage(image, 0, 0, 1024, 1024);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not create the PNG file.')), 'image/png');
        });
        downloadBlob(blob, `kiungo-${selected.code}.png`);
      } finally {
        URL.revokeObjectURL(source);
      }
      setNotice('PNG QR code downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the PNG QR code.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Short link copied.');
      setError('');
    } catch {
      setError('Clipboard access is unavailable in this browser.');
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-7 sm:px-5 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-accent">Share anywhere</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">QR codes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Create downloadable QR codes for your Kiungo short links. Your link stays editable and every scan opens the same destination.</p>
        </div>
        <button onClick={() => void refresh()} className="btn-quiet px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh links</button>
      </div>

      {error ? <p role="alert" className="mt-5 text-sm text-red-600">{error}</p> : null}
      {notice ? <p role="status" className="mt-5 text-sm text-emerald-700">{notice}</p> : null}

      {links === null ? (
        <div className="card mt-7 h-64 animate-pulse" />
      ) : links.length === 0 ? (
        <div className="card mt-7 border-dashed p-10 text-center">
          <QrCode className="mx-auto h-10 w-10 text-muted" />
          <h2 className="mt-4 font-semibold">Create a short link first</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">QR codes are generated from your Kiungo short links, so you can update a destination later without changing the printed QR code.</p>
          <a href="#/links" className="btn-primary mt-5 inline-flex"> <Link2 className="h-4 w-4" /> Go to short links</a>
        </div>
      ) : (
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
          <section className="card space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="font-semibold">Choose a short link</h2>
              <p className="mt-1 text-sm text-muted">Each QR code points to your Kiungo redirect URL.</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Short link</span>
              <select value={selectedId} onChange={event => { setSelectedId(event.target.value); setNotice(''); }} className="w-full rounded-xl border bg-surface px-3 py-3 text-sm">
                {links.map(link => <option key={link.id} value={link.id}>/{link.code} · {link.title || link.destinationUrl}</option>)}
              </select>
            </label>
            {selected ? (
              <>
                <div className="rounded-xl border bg-raised/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Destination</p>
                  <p className="mt-2 break-all text-sm">{selected.destinationUrl}</p>
                  <p className="mt-3 font-mono text-xs text-accent">{value}</p>
                </div>
                <button onClick={() => void copyLink()} className="btn-quiet w-full justify-center"><Link2 className="h-4 w-4" /> Copy short link</button>
              </>
            ) : null}
          </section>

          <section className="card flex flex-col items-center p-5 sm:p-6">
            <div className="flex w-full items-center justify-between">
              <div><h2 className="font-semibold">QR preview</h2><p className="mt-1 text-xs text-muted">High-resolution, black on white</p></div>
              <span className="rounded-lg bg-accent/10 p-2 text-accent"><QrCode className="h-5 w-5" /></span>
            </div>
            {selected ? (
              <>
                <div id="kiungo-qr-preview" className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                  <QRCodeSVG value={value} size={260} level="H" bgColor="#ffffff" fgColor="#111827" marginSize={4} title={`QR code for Kiungo link ${selected.code}`} />
                </div>
                <p className="mt-4 max-w-full break-all text-center font-mono text-xs text-muted">/{selected.code}</p>
                <div className="mt-5 grid w-full grid-cols-2 gap-2">
                  <button onClick={downloadSvg} className="btn-quiet justify-center"><Download className="h-4 w-4" /> SVG</button>
                  <button onClick={() => void downloadPng()} disabled={busy} className="btn-primary justify-center disabled:opacity-60"><Image className="h-4 w-4" /> {busy ? 'Preparing…' : 'PNG'}</button>
                </div>
                <p className="mt-3 text-center text-xs text-muted">SVG is ideal for print. PNG works well for digital sharing.</p>
              </>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
}
