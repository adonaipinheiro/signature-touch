[![npm version](https://img.shields.io/npm/v/react-native-signature-touch.svg)](https://www.npmjs.com/package/react-native-signature-touch)
 [![CI](https://github.com/adonaipinheiro/signature-touch/actions/workflows/ci.yml/badge.svg)](https://github.com/adonaipinheiro/signature-touch/actions/workflows/ci.yml) [![codecov](https://codecov.io/github/adonaipinheiro/signature-touch/graph/badge.svg?token=CS223H7TQR)](https://codecov.io/github/adonaipinheiro/signature-touch) [![install size](https://packagephobia.com/badge?p=react-native-signature-touch)](https://packagephobia.com/result?p=react-native-signature-touch) [![npm downloads](https://img.shields.io/npm/dm/react-native-signature-touch.svg)](https://www.npmjs.com/package/react-native-signature-touch) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)



# react-native-signature-touch

A lightweight and flexible React Native library for capturing smooth, customizable signatures using SVG.

## Example
<img src="https://github.com/user-attachments/assets/63990a48-5e81-4dbd-8293-c497ce0f3afe" width="250" />

## Features

- ✏️ **Smooth signature capture** with quadratic curves
- 🎨 **Customizable stroke** color, width, and background
- ↩️ **Undo/Redo** support
- 🧹 **Clear** signature
- 📦 **Export** as SVG or PNG/JPEG (with scaling & quality control)
- ⚡ **Minimal dependencies** — only `react-native-svg` required
- 📱 **Works on both iOS & Android**

## Installation

```sh
yarn add react-native-signature-touch
yarn add react-native-svg
```

> `react-native-svg` is a peer dependency, so you must install it in your project.

## Usage

```tsx
import React, { useRef } from 'react';
import { View, Button } from 'react-native';
import { Signature, SignatureRef } from 'react-native-signature-touch';

export default function App() {
  const signatureRef = useRef<SignatureRef>(null);

  return (
    <View style={{ flex: 1 }}>
      <Signature
        ref={signatureRef}
        strokeColor="blue"
        strokeWidth={3}
        backgroundColor="white"
        onBegin={() => console.log('Signature started')}
        onEnd={(paths) => console.log('Signature ended', paths)}
      />
      <Button title="Clear" onPress={() => signatureRef.current?.clear()} />
    </View>
  );
}
```

## Props

| Prop              | Type                                   | Default       | Description |
|-------------------|----------------------------------------|---------------|-------------|
| `strokeColor`     | `string`                               | `#000`        | Stroke color |
| `strokeWidth`     | `number`                               | `3`           | Stroke thickness |
| `backgroundColor` | `string`                               | `transparent` | Canvas background color |
| `minDistance`     | `number`                               | `2`           | Minimum distance between points to register |
| `onBegin`         | `() => void`                           | —             | Called when a stroke starts |
| `onEnd`           | `(paths: string[]) => void`            | —             | Called when a stroke ends |
| `onChange`        | `(hasStrokes: boolean) => void`        | —             | Called when signature content changes |
| `style`           | `ViewStyle`                            | —             | Custom style for the container |

## Methods (via `ref`)

| Method        | Description |
|---------------|-------------|
| `clear()`     | Clears the signature |
| `undo()`      | Removes the last stroke |
| `redo()`      | Restores the last undone stroke |
| `isEmpty()`   | Returns `true` if no strokes exist |
| `getSvg()`    | Returns `{ svg, width, height }` for the signature |
| `getImage()`  | Returns a PNG/JPEG base64 string of the signature |

## Exporting as Image

```ts
const img = await signatureRef.current?.getImage({
  mimeType: 'image/jpeg',
  quality: 0.8,
  scale: 2,
});
```

## License

MIT
