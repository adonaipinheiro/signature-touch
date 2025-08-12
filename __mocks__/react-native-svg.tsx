import { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

type ToDataURLOpts = {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpg';
  backgroundColor?: string;
};

const Svg = forwardRef<any, any>((props, ref) => {
  const impl = {
    toDataURL: (cb: (data: string) => void, _opts?: ToDataURLOpts) => {
      cb('data:image/png;base64,TEST_BASE64'); // simula export PNG
    },
  };
  useImperativeHandle(ref, () => impl);
  return <View {...props} />;
});

const Path = (props: any) => <View {...props} />;
const Rect = (props: any) => <View {...props} />;

export default Svg;
export { Path, Rect };
