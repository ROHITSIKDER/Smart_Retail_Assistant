import dns from 'dns';
import { isPrivateIp } from '../utils/ipValidator.js';

export { isPrivateIp };

export const validateUrl = async (req, res, next) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Product URL is required'
    });
  }

  const cleanUrl = url.trim();
  let parsed;

  try {
    parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL protocol. URL must start with http:// or https://'
      });
    }
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Malformed URL provided. Please paste a valid web link.'
    });
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost or local domain patterns
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return res.status(400).json({
      success: false,
      error: 'Access to internal or local resources is restricted for security (SSRF Protection).'
    });
  }

  // DNS Lookup to prevent IP-based SSRF (e.g. http://127.0.0.1, http://169.254.169.254)
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    const hasPrivateIp = addresses.some(addr => isPrivateIp(addr.address));
    if (hasPrivateIp) {
      return res.status(400).json({
        success: false,
        error: 'Access to private network or internal IP addresses is forbidden (SSRF Protection).'
      });
    }
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: `Unable to resolve host domain "${hostname}". Please provide a valid, reachable web URL.`
    });
  }

  req.body.url = cleanUrl;
  next();
};

