import { CompanyPage, companyPageMetadata } from "@/components/site/company-page";

export function generateMetadata({ params }: PageProps<"/[locale]/contact">) {
  return companyPageMetadata(params, "contact");
}

export default function Page({ params }: PageProps<"/[locale]/contact">) {
  return <CompanyPage params={params} pageKey="contact" />;
}
