"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** A generated password shown once, with a copy button. */
export function OneTimePassword({ password }: { password: string }) {
  const t = useTranslations("Admin.users");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // Clipboard blocked (e.g. insecure context): the password stays visible.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 rounded-lg border bg-muted px-3 py-2.5 font-mono text-sm break-all select-all">
        {password}
      </code>
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? t("copiedLabel") : t("copyButton")}
      </Button>
    </div>
  );
}
