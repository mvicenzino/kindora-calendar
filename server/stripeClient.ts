import Stripe from 'stripe';

let connectionSettings: any;

async function fetchStripeConnection(hostname: string, xReplitToken: string, environment: string) {
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', environment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const settings = data.items?.[0];
  if (settings?.settings?.publishable && settings?.settings?.secret) {
    return settings;
  }
  return null;
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

  // Try production connection first when deployed; fall back to development (test mode)
  if (isProduction) {
    const prodSettings = await fetchStripeConnection(hostname!, xReplitToken, 'production');
    if (prodSettings) {
      connectionSettings = prodSettings;
    } else {
      console.warn('[Stripe] No production connection found — falling back to development (test mode)');
      const devSettings = await fetchStripeConnection(hostname!, xReplitToken, 'development');
      if (!devSettings) throw new Error('Stripe connection not found (tried production and development)');
      connectionSettings = devSettings;
    }
  } else {
    const devSettings = await fetchStripeConnection(hostname!, xReplitToken, 'development');
    if (!devSettings) throw new Error('Stripe development connection not found');
    connectionSettings = devSettings;
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    // @ts-expect-error - Stripe API version may differ from types
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
