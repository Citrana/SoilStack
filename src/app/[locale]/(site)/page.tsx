import { CompanyPage, companyPageMetadata } from "@/components/site/company-page";

export function generateMetadata({ params }: PageProps<"/[locale]">) {
  return companyPageMetadata(params, "home");
}

export default function Page({ params }: PageProps<"/[locale]">) {
  return <CompanyPage params={params} pageKey="home" />;
}
