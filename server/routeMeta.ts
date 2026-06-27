interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  jsonLd: object;
}

const BASE_IMAGE = "https://kindora.ai/og-image.png?v=3";
const ORG = {
  "@type": "Organization",
  name: "Kindora",
  url: "https://kindora.ai",
  logo: "https://kindora.ai/kindora-logo.jpeg",
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/intro": {
    title: "Kindora — The family calendar built for real life",
    description:
      "Kindora helps families and caregivers coordinate schedules, medical appointments, and care needs. Built for the Sandwich Generation managing children's activities and eldercare.",
    canonical: "https://kindora.ai/intro",
    ogTitle: "Kindora — The family calendar built for real life",
    ogDescription:
      "Juggling kids, aging parents, and everything in between? Kindora keeps your whole family in sync — schedules, medications, care docs, and more.",
    ogUrl: "https://kindora.ai/intro",
    twitterTitle: "Kindora — The family calendar built for real life",
    twitterDescription:
      "Juggling kids, aging parents, and everything in between? Kindora keeps your whole family in sync.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Kindora — The family calendar built for real life",
      description:
        "Kindora helps families and caregivers coordinate schedules, medical appointments, and care needs. Built for the Sandwich Generation.",
      url: "https://kindora.ai/intro",
      isPartOf: { "@type": "WebSite", name: "Kindora", url: "https://kindora.ai" },
      publisher: ORG,
    },
  },
  "/about": {
    title: "About Kindora — Built for the Sandwich Generation",
    description:
      "Learn why Kindora was built — a family calendar and caregiving coordination app designed for families managing children's activities and eldercare at the same time.",
    canonical: "https://kindora.ai/about",
    ogTitle: "About Kindora — Built for the Sandwich Generation",
    ogDescription:
      "Kindora was built by a caregiver for caregivers. Discover the story behind the family calendar designed for families managing children's activities and eldercare.",
    ogUrl: "https://kindora.ai/about",
    twitterTitle: "About Kindora — Built for the Sandwich Generation",
    twitterDescription:
      "Kindora was built by a caregiver for caregivers. Discover the story behind the family calendar for the sandwich generation.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Kindora",
      description:
        "Learn why Kindora was built — a family calendar and caregiving coordination app for the Sandwich Generation.",
      url: "https://kindora.ai/about",
      isPartOf: { "@type": "WebSite", name: "Kindora", url: "https://kindora.ai" },
      publisher: ORG,
    },
  },
  "/support": {
    title: "Contact Support — Kindora",
    description:
      "Get help with Kindora. Send a message to our team and we'll respond within 24 hours. During beta, every support message goes directly to our founder.",
    canonical: "https://kindora.ai/support",
    ogTitle: "Contact Support — Kindora",
    ogDescription: "Get help with Kindora. Send a message to our team and we'll respond within 24 hours.",
    ogUrl: "https://kindora.ai/support",
    twitterTitle: "Contact Support — Kindora",
    twitterDescription: "Get help with Kindora. Send a message to our team and we'll respond within 24 hours.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact Support — Kindora",
      description: "Get help with Kindora. Send a message to our team and we'll respond within 24 hours.",
      url: "https://kindora.ai/support",
      isPartOf: { "@type": "WebSite", name: "Kindora", url: "https://kindora.ai" },
      publisher: ORG,
    },
  },
  "/resources": {
    title: "Free Caregiver Resources — Kindora",
    description:
      "Free checklists, guides, templates, and self-assessments for family caregivers. Covers eldercare, hospital discharge, Medicare, pediatric info, and caregiver burnout — no account needed.",
    canonical: "https://kindora.ai/resources",
    ogTitle: "Free Caregiver Resources — Kindora",
    ogDescription:
      "Free checklists, guides, templates, and self-assessments for family caregivers. Covers eldercare, hospital discharge, Medicare, pediatric info, and more.",
    ogUrl: "https://kindora.ai/resources",
    twitterTitle: "Free Caregiver Resources — Kindora",
    twitterDescription:
      "Free checklists, guides, templates, and self-assessments for family caregivers. No account needed.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Free Caregiver Resources",
      description:
        "Free checklists, guides, templates, and self-assessments for family caregivers — eldercare, hospital discharge, Medicare, pediatric info, and caregiver burnout.",
      url: "https://kindora.ai/resources",
      isPartOf: { "@type": "WebSite", name: "Kindora", url: "https://kindora.ai" },
      publisher: ORG,
    },
  },
  "/help": {
    title: "Help Center — Kindora",
    description:
      "Get help with Kindora — family calendar, caregiver tools, medication logging, recurring events, document vault, and more. Browse our FAQ or contact support.",
    canonical: "https://kindora.ai/help",
    ogTitle: "Help Center — Kindora",
    ogDescription:
      "Get help with Kindora — family calendar, caregiver tools, medication logging, and more. Browse our FAQ or contact support.",
    ogUrl: "https://kindora.ai/help",
    twitterTitle: "Help Center — Kindora",
    twitterDescription: "Get help with Kindora — family calendar, caregiver tools, medication logging, and more.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      name: "Help Center — Kindora",
      description:
        "Frequently asked questions about Kindora — family calendar, caregiver tools, medication logging, recurring events, document vault, and more.",
      url: "https://kindora.ai/help",
      isPartOf: { "@type": "WebSite", name: "Kindora", url: "https://kindora.ai" },
      publisher: ORG,
    },
  },
  "/terms": {
    title: "Terms of Service — Kindora",
    description:
      "Read the Kindora Terms of Service. Understand the rules and guidelines for using the Kindora family calendar and caregiving coordination platform.",
    canonical: "https://kindora.ai/terms",
    ogTitle: "Terms of Service — Kindora",
    ogDescription: "Read the Kindora Terms of Service for the family calendar and caregiving coordination platform.",
    ogUrl: "https://kindora.ai/terms",
    twitterTitle: "Terms of Service — Kindora",
    twitterDescription: "Read the Kindora Terms of Service for the family calendar and caregiving coordination platform.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Terms of Service — Kindora",
      description:
        "Kindora Terms of Service. Rules and guidelines for using the Kindora family calendar and caregiving coordination platform.",
      url: "https://kindora.ai/terms",
      isPartOf: { "@type": "WebSite", name: "Kindora", url: "https://kindora.ai" },
      publisher: ORG,
    },
  },
  "/privacy": {
    title: "Privacy Policy — Kindora",
    description:
      "Learn how Kindora collects, uses, and protects your personal and family data. Our Privacy Policy covers data security, retention, cookies, and your rights.",
    canonical: "https://kindora.ai/privacy",
    ogTitle: "Privacy Policy — Kindora",
    ogDescription:
      "Learn how Kindora protects your personal and family data. Our Privacy Policy covers data security, retention, cookies, and your rights.",
    ogUrl: "https://kindora.ai/privacy",
    twitterTitle: "Privacy Policy — Kindora",
    twitterDescription:
      "Learn how Kindora protects your personal and family data. Our Privacy Policy covers security, retention, cookies, and your rights.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy Policy — Kindora",
      description:
        "How Kindora collects, uses, and protects your personal and family data — data security, retention, cookies, and your rights.",
      url: "https://kindora.ai/privacy",
      isPartOf: { "@type": "WebSite", name: "Kindora", url: "https://kindora.ai" },
      publisher: ORG,
    },
  },
};

export function injectRouteMeta(html: string, pathname: string): string {
  const cleanPath = pathname.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  const meta = ROUTE_META[cleanPath];
  if (!meta) return html;

  const jsonLdScript = `<script type="application/ld+json">\n    ${JSON.stringify(meta.jsonLd, null, 2)}\n    </script>`;

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    )
    .replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    )
    .replace(
      /<meta property="og:url"[^>]*>/,
      `<meta property="og:url" content="${escapeHtml(meta.ogUrl)}" />`,
    )
    .replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${escapeHtml(meta.ogTitle)}" />`,
    )
    .replace(
      /<meta property="og:description"[^>]*>/,
      `<meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />`,
    )
    .replace(
      /<meta name="twitter:url"[^>]*>/,
      `<meta name="twitter:url" content="${escapeHtml(meta.ogUrl)}" />`,
    )
    .replace(
      /<meta name="twitter:title"[^>]*>/,
      `<meta name="twitter:title" content="${escapeHtml(meta.twitterTitle)}" />`,
    )
    .replace(
      /<meta name="twitter:description"[^>]*>/,
      `<meta name="twitter:description" content="${escapeHtml(meta.twitterDescription)}" />`,
    )
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      jsonLdScript,
    );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
