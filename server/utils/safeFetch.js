import http from 'http';
import https from 'https';
import dns from 'dns';
import axios from 'axios';
import { isPrivateIp } from './ipValidator.js';

export function safeLookup(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }

  dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) {
      return cb(err);
    }
    if (!addresses || addresses.length === 0) {
      return cb(new Error(`DNS resolution failed for host: ${hostname}`));
    }

    for (const addr of addresses) {
      const ip = typeof addr === 'string' ? addr : addr.address;
      if (isPrivateIp(ip)) {
        const blockErr = new Error(`SSRF Blocked: Connection to private/internal IP address (${ip}) is forbidden.`);
        blockErr.code = 'ERR_SSRF_BLOCKED';
        return cb(blockErr);
      }
    }

    if (opts && opts.all) {
      return cb(null, addresses);
    }
    const first = addresses[0];
    return cb(null, first.address, first.family);
  });
}

export const safeHttpAgent = new http.Agent({
  lookup: safeLookup,
  keepAlive: true,
  timeout: 15000
});

export const safeHttpsAgent = new https.Agent({
  lookup: safeLookup,
  keepAlive: true,
  timeout: 15000
});

export function createSafeAxios(config = {}) {
  return axios.create({
    httpAgent: safeHttpAgent,
    httpsAgent: safeHttpsAgent,
    maxRedirects: 5,
    maxContentLength: 10 * 1024 * 1024, // 10MB payload limit
    ...config
  });
}
