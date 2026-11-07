import { CompanyPage, companyPageMetadata } from "@/components/site/company-page";

export function generateMetadata({ params }: PageProps<"/[locale]/projects">) {
  return companyPageMetadata(params, "projects");
}

export default function Page({ params }: PageProps<"/[locale]/projects">) {
  return <CompanyPage params={params} pageKey="projects" />;
}
