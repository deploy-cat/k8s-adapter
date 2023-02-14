import { IngressTLS } from "kubernetes_apis/builtin/networking";
import { ArrayRule, ObjectRule, Rule } from "hoyams";

type SerializedConfig = {
  certs: Array<{
    match: string;
    cert: {
      secretName: string;
    };
  }>;
};

export type CertRule = {
  match: RegExp;
  cert: IngressTLS;
};

const configRule = new ObjectRule<SerializedConfig>({
  certs: new ArrayRule({
    match: new Rule((v) => {
      try {
        return !!new RegExp(v as string) || "no regex";
      } catch (e) {
        return e.toString();
      }
    }),
    cert: {
      secretName: new Rule((v) =>
        typeof v === "string" || v === undefined || "is not a string"
      ),
    },
  }),
});

const deserialiceConfig = (json: string) => {
  const parsed = configRule.validate(JSON.parse(json));
  return {
    certs: parsed.certs.map(({ match, cert }) => ({
      match: new RegExp(match),
      cert,
    })) as Array<CertRule>,
  };
};

export const store = {
  config: deserialiceConfig(await Deno.readTextFile("./config.json")),
};
