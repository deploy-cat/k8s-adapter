export type Rule = (a: unknown) => true | string;
export type RuleMap = { [key: string]: Array<Rule> | Rule };

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
  if (errors.length > 0) throw { errorMap: Object.fromEntries(errors) };
  return obj;
};
