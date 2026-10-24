"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SSO_ERROR_PARAM, ssoErrorKey } from "@/app/_consts/sso";

export const useSsoError = (): string => {
  const t = useTranslations("auth");
  const key = ssoErrorKey(useSearchParams().get(SSO_ERROR_PARAM));
  return key ? t(key) : "";
};
