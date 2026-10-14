#!/usr/bin/env node

import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_PORT = 54321;
const DEFAULT_OUT_DIR = path.resolve('docs/qa/journey-second-by-second-2026-01-31');
const MAX_BYTES = 50 * 1024 * 1024;

function sanitizeFilenamePart(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || 'capture';
}

function send(res, status, body, headers = {}) {
    res.writeHead(status, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...headers
    });
    res.end(body);
}

async function main() {
    const port = Number(process.env.PORT || DEFAULT_PORT);
    const outDir = path.resolve(process.env.OUT_DIR || DEFAULT_OUT_DIR);
    await fs.mkdir(outDir, { recursive: true });

    const server = http.createServer(async (req, res) => {
        try {
            if (req.method === 'OPTIONS') {
                send(res, 204, '');
                return;
            }

            if (req.method !== 'POST') {
                send(res, 405, 'Method Not Allowed');
                return;
            }

            const url = new URL(req.url || '/', `http://localhost:${port}`);
            if (url.pathname !== '/save') {
                send(res, 404, 'Not Found');
                return;
            }

            let body = '';
            let bytes = 0;
            req.setEncoding('utf8');
            req.on('data', (chunk) => {
                bytes += Buffer.byteLength(chunk, 'utf8');
                if (bytes > MAX_BYTES) {
                    req.destroy(new Error('Payload too large'));
                    return;
                }
                body += chunk;
            });

            req.on('end', async () => {
                const nameParam = url.searchParams.get('name');
                const trackParam = url.searchParams.get('track');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const baseName = sanitizeFilenamePart(nameParam || trackParam || `capture-${timestamp}`);

                const filePath = path.join(outDir, `${baseName}.json`);
                await fs.writeFile(filePath, body, 'utf8');

                send(
                    res,
                    200,
                    JSON.stringify({ ok: true, file: filePath }),
                    { 'Content-Type': 'application/json; charset=utf-8' }
                );
            });

            req.on('error', (error) => {
                send(res, 400, `Bad Request: ${error.message}`);
            });
        } catch (error) {
            send(res, 500, `Server Error: ${error.message}`);
        }
    });

    server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`[journey-capture-server] Listening on http://localhost:${port}`);
        // eslint-disable-next-line no-console
        console.log(`[journey-capture-server] Writing captures to ${outDir}`);
    });
}

await main();

