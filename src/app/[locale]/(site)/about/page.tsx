import { CompanyPage, companyPageMetadata } from "@/components/site/company-page";

export function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  return companyPageMetadata(params, "about");
}

export default function Page({ params }: PageProps<"/[locale]/about">) {
  return <CompanyPage params={params} pageKey="about" />;
}
