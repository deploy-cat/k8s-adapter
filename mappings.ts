import { IngressTLS } from "kubernetes_apis/builtin/networking";
import { CertRule, store } from "./store.ts";

const certs = store.config.certs as Array<CertRule>;

export const getCert = (host: string): IngressTLS | undefined => {
  return certs.find(({ match }) => !!host.match(match))?.cert;
};
