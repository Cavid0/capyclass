import { headers } from "next/headers";
import { HomePageClient } from "@/components/home/HomePageClient";
import { serializeJsonForHtmlScript } from "@/lib/utils";

export default function HomePage() {
  const nonce = headers().get("x-nonce") ?? undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "CapyClass",
    "alternateName": ["capyclass", "capy class", "CapyClass.com"],
    "url": "https://capyclass.com",
    "description": "CapyClass is the interactive coding classroom platform where teachers create classrooms, assign coding tasks, and students write & run code in real-time with AI-powered analysis.",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "browserRequirements": "Requires a modern web browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "creator": {
      "@type": "Organization",
      "name": "CapyClass",
      "url": "https://capyclass.com",
    },
    "featureList": [
      "Interactive code editor with Monaco (VS Code engine)",
      "Real-time classroom management",
      "Multi-language code execution",
      "AI-powered code analysis",
      "Student workspace isolation",
      "Task assignment and review system",
    ],
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CapyClass",
    "url": "https://capyclass.com",
    "logo": "https://capyclass.com/capybara.png",
    "description": "Interactive coding classroom platform for teachers and students",
  };

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonForHtmlScript(jsonLd) }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonForHtmlScript(orgJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}

