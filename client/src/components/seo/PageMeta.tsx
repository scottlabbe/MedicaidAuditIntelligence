import { Helmet } from "react-helmet-async";

const SITE_NAME = "Medicaid Audit Intelligence";
const SITE_URL = "https://www.medicaidintelligence.com";

interface PageMetaProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  jsonLd?: object | object[];
  robots?: string;
}

export default function PageMeta({
  title,
  description,
  canonicalPath,
  ogType = "website",
  jsonLd,
  robots = "index, follow",
}: PageMetaProps) {
  const fullTitle = title.includes(SITE_NAME)
    ? title
    : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonicalPath
    ? canonicalPath === "/"
      ? SITE_URL
      : `${SITE_URL}${canonicalPath}`
    : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="robots" content={robots} />
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
}
