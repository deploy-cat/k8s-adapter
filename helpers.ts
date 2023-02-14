export type Rule = (a: unknown) => true | string;
export type RuleMap = { [key: string]: Array<Rule> | Rule };
export type ErrorMap = { [key: string]: Array<string> };

export class ValidateError extends Error {
  map: ErrorMap;

  constructor(message: string, options: ErrorOptions & { map: ErrorMap }) {
    super(message, options);
    this.map = options.map;
  }
}

export const validate = (
  obj: { [key: string]: unknown },
  ruleMap: RuleMap,
) => {
  const errors = Object.entries(ruleMap)
    .map(([key, rules]) => [
      key,
      (Array.isArray(rules) ? rules : [rules])
        .map((rule) => rule(obj[key]))
        .filter((result) => result !== true),
    ])
    .filter((results) => results[1].length > 0);
  if (errors.length > 0) {
    throw new ValidateError(
      errors.map((error) => error.join(": ")).join(", "),
      { map: Object.fromEntries(errors) },
    );
  }
  return obj;
};
