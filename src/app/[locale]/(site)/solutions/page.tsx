import { CompanyPage, companyPageMetadata } from "@/components/site/company-page";

export function generateMetadata({ params }: PageProps<"/[locale]/solutions">) {
  return companyPageMetadata(params, "solutions");
}

export default function Page({ params }: PageProps<"/[locale]/solutions">) {
  return <CompanyPage params={params} pageKey="solutions" />;
}
