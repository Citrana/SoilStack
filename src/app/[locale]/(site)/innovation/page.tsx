import { CompanyPage, companyPageMetadata } from "@/components/site/company-page";

export function generateMetadata({ params }: PageProps<"/[locale]/innovation">) {
  return companyPageMetadata(params, "innovation");
}

export default function Page({ params }: PageProps<"/[locale]/innovation">) {
  return <CompanyPage params={params} pageKey="innovation" />;
}
