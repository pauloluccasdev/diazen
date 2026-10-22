import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = (
  _error,
  _request,
  context,
) => {
  // Route templates identify failing modules without recording request URLs,
  // headers, form values, provider errors, or health information.
  console.error(
    JSON.stringify({
      event: "request_failed",
      route: context.routePath,
      type: context.routeType,
      at: new Date().toISOString(),
    }),
  );
};
