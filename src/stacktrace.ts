import type {
  StackLineParser,
  StackLineParserFn,
  StackParser,
} from '@sentry/types';
import {
  basename,
  createStackParser,
  nodeStackLineParser,
} from '@sentry/utils';

type GetModuleFn = (filename: string | undefined) => string | undefined;

/**
 * Stack line parser for Cloudflare Workers.
 * This wraps node stack parser and adjusts root paths to match with source maps.
 *
 */
function workersStackLineParser(getModule?: GetModuleFn): StackLineParser {
  const [arg1, arg2] = nodeStackLineParser(getModule);

  const fn: StackLineParserFn = (line) => {
    const result = arg2(line);
    if (result) {
      const filename = result.filename;
      // Workers runtime runs a single bundled file that is always in a virtual root
      result.abs_path =
        filename !== undefined && !filename.startsWith('/')
          ? `/${filename}`
          : filename;
      // There is no way to tell what code is in_app and what comes from dependencies (node_modules), since we have one bundled file.
      // So everything is in_app, unless an error comes from runtime function (ie. JSON.parse), which is determined by the presence of filename.
      result.in_app = filename !== undefined;
    }
    return result;
  };

  return [arg1, fn];
}

/**
 * Gets the module from filename.
 *
 * @param filename
 * @returns Module name
 */
export function getModule(filename: string | undefined): string | undefined {
  if (!filename) {
    return;
  }

  // In Cloudflare Workers there is always only one bundled file
  return basename(filename, '.js');
}

/** Cloudflare Workers stack parser */
export const defaultStackParser: StackParser = createStackParser(
  workersStackLineParser(getModule),
);
