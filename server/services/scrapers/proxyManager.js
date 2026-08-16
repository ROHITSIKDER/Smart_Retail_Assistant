const COOLDOWN_MS = 5 * 60 * 1000;

let poolCache = null;
let roundRobinIndex = 0;
const failedProxies = new Map();

function parseProxyUrl(proxyUrl) {
  try {
    const parsed = new URL(proxyUrl.trim());
    const cleanUrl = `${parsed.protocol}//${parsed.host}`;
    return {
      url: cleanUrl,
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || (parsed.protocol === 'https:' ? 443 : 8080),
      auth: parsed.username && parsed.password
        ? { username: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password) }
        : undefined
    };
  } catch {
    return null;
  }
}

function buildPool() {
  const poolEnv = process.env.PROXY_POOL;
  const legacyEnv = process.env.PROXY_SERVER_URL;
  const raw = poolEnv || legacyEnv || '';

  return raw
    .split(',')
    .map((entry) => parseProxyUrl(entry))
    .filter(Boolean);
}

function getPool() {
  if (!poolCache) {
    poolCache = buildPool();
  }
  return poolCache;
}

function getAvailableProxies() {
  const now = Date.now();
  return getPool().filter((proxy) => {
    const failedAt = failedProxies.get(proxy.url);
    return !failedAt || now - failedAt >= COOLDOWN_MS;
  });
}

export class ProxyManager {
  static resetForTests() {
    poolCache = null;
    roundRobinIndex = 0;
    failedProxies.clear();
  }

  static getUserAgents() {
    return [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ];
  }

  static getRandomHeaders() {
    const uas = this.getUserAgents();
    const selectedUA = uas[Math.floor(Math.random() * uas.length)];

    return {
      'User-Agent': selectedUA,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Sec-CH-UA': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  static getMaxRetries() {
    const parsed = parseInt(process.env.PROXY_MAX_RETRIES, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  }

  static getNextProxy() {
    const available = getAvailableProxies();
    if (available.length === 0) {
      return null;
    }

    const strategy = (process.env.PROXY_ROTATION || 'round_robin').toLowerCase();
    if (strategy === 'random') {
      return available[Math.floor(Math.random() * available.length)];
    }

    const proxy = available[roundRobinIndex % available.length];
    roundRobinIndex += 1;
    return proxy;
  }

  static markProxyFailed(proxyUrl) {
    if (proxyUrl) {
      failedProxies.set(proxyUrl, Date.now());
    }
  }

  static getProxyConfig(proxyEntry = null) {
    const proxy = proxyEntry || this.getNextProxy();
    if (!proxy) {
      return null;
    }

    return {
      host: proxy.host,
      port: proxy.port,
      auth: proxy.auth,
      _url: proxy.url
    };
  }

  static getPlaywrightProxy(proxyEntry = null) {
    const proxy = proxyEntry || this.getNextProxy();
    if (!proxy) {
      return null;
    }

    const proxyUrl = proxy.url || proxy._url;
    if (!proxyUrl) {
      return null;
    }

    const parsed = new URL(proxyUrl);
    const config = { server: `${parsed.protocol}//${parsed.host}` };
    if (proxy.auth) {
      config.username = proxy.auth.username;
      config.password = proxy.auth.password;
    }
    return { config, url: proxyUrl };
  }
}
