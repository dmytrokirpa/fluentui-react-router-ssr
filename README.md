# FLuentUI + React Router 7 SSR setup

## Installation

1. Create a new React Router project:

```bash
npx create-react-router@latest react-router
```

2. Install dependencies:

```bash
# Install Fluent UI core packages
npm i @fluentui/react-components @fluentui/react-icons

# Install required Vite plugins
npm i vite-plugin-cjs-interop @griffel/vite-plugin -D
```

## Configuration

1. Update `vite.config.ts`:

```ts
import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { cjsInterop } from 'vite-plugin-cjs-interop';
import griffel from '@griffel/vite-plugin';

export default defineConfig(({ command }) => ({
  plugins: [
    remix(),
    tsconfigPaths(),
    // Add CJS interop plugin for Fluent UI packages,
    // as they are CommonJS modules
    cjsInterop({
      dependencies: ['@fluentui/react-components'],
    }),
    // Add Griffel plugin for production optimization
    command === 'build' && griffel(),
  ],
  // Required for Fluent UI icons in SSR
  ssr: {
    noExternal: ['@fluentui/react-icons'],
  },
}));
```

2. Modify `app/root.tsx` to add Fluent UI providers:

```tsx
// 1. Import Fluent UI dependencies
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* 2. Add insertion point for Fluent UI styles */}
        <meta name="fluentui-insertion-point" content="fluentui-insertion-point" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* 3. Wrap app content with FluentProvider */}
        <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

3. Set up SSR in:

- Reveal `app/entry.client.tsx` and `app/entry.server.tsx` files:

```bash
npx react-router reveal
```

- and then update the `entry.server.tsx`:

```tsx
// 1. Import required Fluent UI SSR utilities
import { createDOMRenderer, RendererProvider, renderToStyleElements, SSRProvider } from '@fluentui/react-components';

// 2. Define constants for style injection
const FLUENT_UI_INSERTION_POINT_TAG = `<meta name="fluentui-insertion-point" content="fluentui-insertion-point"/>`;
const FLUENT_UI_INSERTION_TAG_REGEX = new RegExp(FLUENT_UI_INSERTION_POINT_TAG.replaceAll(' ', '(\\s)*'));

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  // 3. Create Fluent UI renderer
  const renderer = createDOMRenderer();
  const callbackName = isbot(request.headers.get('user-agent')) ? 'onAllReady' : 'onShellReady';

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    // 4. Track style extraction state
    let isStyleExtracted = false;

    const { pipe, abort } = renderToPipeableStream(
      // 5. Wrap RemixServer with Fluent UI providers
      <RendererProvider renderer={renderer}>
        <SSRProvider>
          <ServerRouter
            context={routerContext}
            url={request.url}
            abortDelay={ABORT_DELAY}
          />
        </SSRProvider>
      </RendererProvider>,
      {
        [callbackName]: () => {
          shellRendered = true;
          const body = new PassThrough({
            // 6. Transform stream to inject Fluent UI styles
            transform(chunk, _, callback) {
              const str = chunk.toString();
              const style = renderToStaticMarkup(<>{renderToStyleElements(renderer)}</>);

              if (!isStyleExtracted && FLUENT_UI_INSERTION_TAG_REGEX.test(str)) {
                chunk = str.replace(FLUENT_UI_INSERTION_TAG_REGEX, `${FLUENT_UI_INSERTION_POINT_TAG}${style}`);
                isStyleExtracted = true;
              }

              callback(null, chunk);
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError: reject,
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
```

## Usage Example

Create or update `app/routes/_index.tsx`:

```tsx
import { Button, Card, Title1, Body1 } from '@fluentui/react-components';
import { BookmarkRegular } from '@fluentui/react-icons';

export default function Index() {
  return (
    <Card style={{ maxWidth: '400px', margin: '20px' }}>
      <Title1>Fluent UI + Remix</Title1>
      <Body1>Welcome to your new app!</Body1>
      <Button icon={<BookmarkRegular />}>Click me</Button>
    </Card>
  );
}
```

## Troubleshooting

### Common Issues

1. **SSR Hydration Mismatch**

```
Text content does not match server-rendered HTML
```

Fix: Check style injection in `entry.server.tsx`.

2. **Icons Not Rendering in SSR**

```
Error: No "exports" main defined in node_modules/@fluentui/react-icons/package.json
```

Fix: Add to `vite.config.ts`:

```ts
ssr: {
  noExternal: ["@fluentui/react-icons"],
}
```

3. **Module Resolution Errors**

```
Cannot use import statement outside a module
```

Fix: Add to `vite.config.ts`:

```ts
cjsInterop({
  dependencies: ["@fluentui/react-components"],
}),
```

4. **Development Mode Warning**

```
@fluentui/react-provider: There are conflicting ids in your DOM.
Please make sure that you configured your application properly.
Configuration guide: https://aka.ms/fluentui-conflicting-ids
```

This warning occurs in development due to React's StrictMode double rendering. It can be safely ignored as it doesn't affect production builds.

### Production Build Optimization

For production builds, install and configure [`@griffel/vite-plugin`](https://griffel.js.org/react/ahead-of-time-compilation/with-vite) to enable build time pre-computing and transforming styles.
